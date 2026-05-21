// FILE: src/domain/ai/transcription.ts
// AssemblyAI integration: upload audio → speaker diarization → utterances

import type { SpeakerUtterance } from "@/domain/types";

const BASE_URL = "https://api.assemblyai.com/v2";

function getApiKey(): string {
  const key = import.meta.env.VITE_ASSEMBLYAI_API_KEY;
  if (!key) throw new Error("VITE_ASSEMBLYAI_API_KEY is not set in .env");
  return key;
}

// -------------------------------------------------------
// Step 1: Upload raw audio bytes to AssemblyAI
// -------------------------------------------------------
async function uploadAudio(audioBlob: Blob): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/octet-stream",
    },
    body: audioBlob,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AssemblyAI upload failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.upload_url as string;
}

// -------------------------------------------------------
// Step 2: Submit transcription job with speaker_labels
// -------------------------------------------------------
async function submitTranscript(audioUrl: string): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(`${BASE_URL}/transcript`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
      speech_models: ["universal-2"],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AssemblyAI submit failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.id as string;
}

// -------------------------------------------------------
// Step 3: Poll until complete (2s interval, 2 min max)
// -------------------------------------------------------
async function pollTranscript(
  transcriptId: string,
  onProgress?: (attempt: number) => void
): Promise<{ text: string; utterances: SpeakerUtterance[] }> {
  const apiKey = getApiKey();
  const MAX_ATTEMPTS = 60;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    onProgress?.(attempt);

    const response = await fetch(`${BASE_URL}/transcript/${transcriptId}`, {
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AssemblyAI poll failed (${response.status}): ${body}`);
    }

    const data = await response.json();

    if (data.status === "completed") {
      const utterances: SpeakerUtterance[] = (data.utterances ?? []).map(
        (u: any) => ({
          speaker: u.speaker as string,
          text: u.text as string,
          start: u.start as number,
          end: u.end as number,
        })
      );

      return {
        text: data.text ?? "",
        utterances,
      };
    }

    if (data.status === "error") {
      throw new Error(`AssemblyAI transcription error: ${data.error}`);
    }

    // status === "queued" | "processing" — keep polling
  }

  throw new Error("Transcription timed out after 2 minutes");
}

// -------------------------------------------------------
// Public: full pipeline
// -------------------------------------------------------
export async function transcribeWithDiarization(
  audioBlob: Blob,
  onProgress?: (attempt: number) => void
): Promise<{ text: string; utterances: SpeakerUtterance[] }> {
  const uploadUrl = await uploadAudio(audioBlob);
  const transcriptId = await submitTranscript(uploadUrl);
  return pollTranscript(transcriptId, onProgress);
}
