// FILE: src/domain/ai/speakerIdentification.ts
// Azure Cognitive Services — Speaker Recognition (Text-Independent)
// Docs: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speaker-recognition-overview

import type { SpeakerUtterance } from "@/domain/types";

function getConfig() {
  const key = import.meta.env.VITE_AZURE_SPEECH_KEY;
  const endpoint = import.meta.env.VITE_AZURE_SPEECH_ENDPOINT?.replace(/\/$/, "");
  if (!key || !endpoint) {
    throw new Error("VITE_AZURE_SPEECH_KEY or VITE_AZURE_SPEECH_ENDPOINT is not set in .env");
  }
  return { key, base: `${endpoint}/speaker-recognition/verification/v2.0/text-independent` };
}

// -------------------------------------------------------
// 1. Create a speaker profile → returns profileId
// -------------------------------------------------------
export async function createSpeakerProfile(): Promise<string> {
  const { key, base } = getConfig();
  const res = await fetch(`${base}/profiles`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ locale: "en-us" }),
  });
  if (!res.ok) throw new Error(`Azure: create profile failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.profileId as string;
}

// -------------------------------------------------------
// 2. Enroll voice into a profile (needs 20+ seconds of clear speech)
// -------------------------------------------------------
export async function enrollVoice(profileId: string, audioBlob: Blob): Promise<void> {
  const { key, base } = getConfig();
  const wavBlob = await toWavBlob(audioBlob);
  const res = await fetch(`${base}/profiles/${profileId}/enrollments`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "audio/wav",
    },
    body: wavBlob,
  });
  if (!res.ok) throw new Error(`Azure: enroll failed (${res.status}): ${await res.text()}`);
}

// -------------------------------------------------------
// 3. Verify: returns confidence score 0.0–1.0
// -------------------------------------------------------
async function verifyVoice(profileId: string, wavBlob: Blob): Promise<number> {
  const { key, base } = getConfig();
  const res = await fetch(`${base}/profiles/${profileId}/verify`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "audio/wav",
    },
    body: wavBlob,
  });
  if (!res.ok) throw new Error(`Azure: verify failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return (data.score ?? 0) as number;
}

// -------------------------------------------------------
// 4. Identify which speaker label is Matthew
//    Extracts each speaker's audio segments, runs verification,
//    returns the label with highest score above threshold.
// -------------------------------------------------------
export async function identifyMatthewSpeaker(
  audioBlob: Blob,
  profileId: string,
  utterances: SpeakerUtterance[]
): Promise<string | null> {
  const speakers = [...new Set(utterances.map((u) => u.speaker))];
  let bestLabel: string | null = null;
  let bestScore = 0.45; // minimum confidence threshold

  for (const speaker of speakers) {
    const segments = utterances.filter((u) => u.speaker === speaker);
    try {
      const wavBlob = await extractSpeakerWav(audioBlob, segments);
      const score = await verifyVoice(profileId, wavBlob);
      if (score > bestScore) {
        bestScore = score;
        bestLabel = speaker;
      }
    } catch {
      // Skip this speaker if extraction or verification fails
    }
  }

  return bestLabel;
}

// -------------------------------------------------------
// Audio helpers
// -------------------------------------------------------

// Extract segments belonging to one speaker and merge into a WAV blob
async function extractSpeakerWav(audioBlob: Blob, utterances: SpeakerUtterance[]): Promise<Blob> {
  const audioCtx = new AudioContext();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  const segments: Float32Array[] = [];
  let totalSamples = 0;

  for (const u of utterances) {
    const startSample = Math.floor((u.start / 1000) * sampleRate);
    const endSample = Math.min(Math.floor((u.end / 1000) * sampleRate), channelData.length);
    if (endSample > startSample) {
      const seg = channelData.slice(startSample, endSample);
      segments.push(seg);
      totalSamples += seg.length;
    }
  }

  const merged = new Float32Array(totalSamples);
  let offset = 0;
  for (const seg of segments) {
    merged.set(seg, offset);
    offset += seg.length;
  }

  return new Blob([floatToWav(merged, sampleRate)], { type: "audio/wav" });
}

// Convert entire audio blob to WAV (for enrollment)
async function toWavBlob(audioBlob: Blob): Promise<Blob> {
  const audioCtx = new AudioContext();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();
  return new Blob([floatToWav(audioBuffer.getChannelData(0), audioBuffer.sampleRate)], {
    type: "audio/wav",
  });
}

// Encode Float32Array PCM samples to a WAV ArrayBuffer
function floatToWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const int16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const buffer = new ArrayBuffer(44 + int16.byteLength);
  const view = new DataView(buffer);
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  write(0, "RIFF");
  view.setUint32(4, 36 + int16.byteLength, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);   // chunk size
  view.setUint16(20, 1, true);    // PCM
  view.setUint16(22, 1, true);    // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);    // block align
  view.setUint16(34, 16, true);   // bits per sample
  write(36, "data");
  view.setUint32(40, int16.byteLength, true);
  new Int16Array(buffer, 44).set(int16);

  return buffer;
}
