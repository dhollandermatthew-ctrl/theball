/**
 * recordingSession.ts
 *
 * Module-level singleton for the active recording session.
 * Lives outside React — survives component unmounts/remounts.
 * Subscriptions let mounted components react to state changes.
 */

import { generateId } from "./utils";
import { useAppStore } from "./state";
import { transcribeWithDiarization } from "./ai/transcription";
import type { TranscriptRecord } from "./types";

// -------------------------------------------------------
// Public session shape
// -------------------------------------------------------
export interface RecordingSessionState {
  isActive: boolean;
  mode: "room" | "call";
  startedAt: number;       // Date.now() when recording began
  segments: string[];      // finalized speech segments (Web Speech API)
  interimText: string;     // current partial segment (updates rapidly)
  pendingRecordId: string | null; // set after stop, cleared by component on navigate
}

// -------------------------------------------------------
// Internal mutable state
// -------------------------------------------------------
let _state: RecordingSessionState = {
  isActive: false,
  mode: "room",
  startedAt: 0,
  segments: [],
  interimText: "",
  pendingRecordId: null,
};

// Non-serializable recording objects — kept as plain vars
let _mediaRecorder: MediaRecorder | null = null;
let _chunks: Blob[] = [];
let _stream: MediaStream | null = null;
let _displayStream: MediaStream | null = null;
let _audioCtx: AudioContext | null = null;
let _recognition: any = null;
let _isRecordingFlag = false; // separate from state to avoid closure staleness
let _textAccumulator = "";    // full accumulated text (for saving)

// -------------------------------------------------------
// Pub/sub
// -------------------------------------------------------
const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((fn) => fn());
}

export function getSessionState(): RecordingSessionState {
  return _state;
}

export function subscribeSession(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function clearPendingRecordId(): void {
  _state = { ..._state, pendingRecordId: null };
}

// -------------------------------------------------------
// Start recording
// -------------------------------------------------------
export async function startRecording(mode: "room" | "call"): Promise<void> {
  console.log("[recording] startRecording called, mode:", mode, "isActive:", _state.isActive);
  if (_state.isActive) {
    console.log("[recording] already active, returning early");
    return;
  }

  // Reset
  _chunks = [];
  _textAccumulator = "";
  _state = { isActive: false, mode, startedAt: 0, segments: [], interimText: "", pendingRecordId: null };
  _notify();

  console.log("[recording] requesting getUserMedia...");
  let micStream: MediaStream;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("[recording] getUserMedia OK, tracks:", micStream.getAudioTracks().length);
  } catch (e: any) {
    console.error("[recording] getUserMedia FAILED:", e.name, e.message, e);
    throw e;
  }
  _stream = micStream;
  let streamToRecord: MediaStream = micStream;

  if (mode === "call") {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false } as any,
      });
      _displayStream = displayStream;
      displayStream.getVideoTracks().forEach((t) => t.stop()); // drop video, keep audio

      const displayAudioTrack = displayStream.getAudioTracks()[0];
      if (displayAudioTrack) {
        const audioCtx = new AudioContext();
        _audioCtx = audioCtx;
        const dest = audioCtx.createMediaStreamDestination();
        audioCtx.createMediaStreamSource(new MediaStream([displayAudioTrack])).connect(dest);
        audioCtx.createMediaStreamSource(micStream).connect(dest);
        streamToRecord = dest.stream;
      }
    } catch (e: any) {
      // Any screen-share failure (denied, cancelled, unsupported) — fall back to mic only.
      // Do NOT re-throw: the mic stream is already obtained and we can still record.
      console.warn("getDisplayMedia failed, recording mic only:", (e as Error).name, (e as Error).message);
    }
  }

  // Web Speech API — live captions (mic only, API limitation)
  const SpeechAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (SpeechAPI) {
    const recognition = new SpeechAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = (event.results[i][0].transcript as string).trim();
          if (text) {
            _textAccumulator += (_textAccumulator ? " " : "") + text;
            _state = { ..._state, segments: [..._state.segments, text] };
            _notify();
          }
        } else {
          interim = event.results[i][0].transcript as string;
        }
      }
      if (_state.interimText !== interim) {
        _state = { ..._state, interimText: interim };
        _notify();
      }
    };

    recognition.onend = () => {
      if (_isRecordingFlag) recognition.start();
    };

    recognition.onstart = () => {
      console.log("[SpeechRecognition] started");
    };

    recognition.onerror = (e: any) => {
      // Log ALL errors so we can diagnose why live captions may not appear.
      console.warn("[SpeechRecognition] error:", e.error);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        // Permission denied — push a visible hint into segments so the user knows
        _state = { ..._state, segments: [..._state.segments, "⚠️ Live captions blocked — check Speech Recognition permission in System Preferences → Privacy & Security."] };
        _notify();
      }
    };

    _recognition = recognition;
    recognition.start();
  }

  // MediaRecorder
  const recorder = new MediaRecorder(streamToRecord, { mimeType: "audio/webm" });
  _mediaRecorder = recorder;

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) _chunks.push(e.data);
  };

  recorder.onstart = () => {
    _isRecordingFlag = true;
    _state = { ..._state, isActive: true, startedAt: Date.now() };
    _notify();
  };

  recorder.onstop = async () => {
    _isRecordingFlag = false;

    // Stop and release all media devices so the next recording can acquire them
    _stream?.getTracks().forEach((t) => t.stop());
    _stream = null;
    _displayStream?.getTracks().forEach((t) => t.stop());
    _displayStream = null;
    _audioCtx?.close();
    _audioCtx = null;
    _recognition?.stop();
    _recognition = null;
    _mediaRecorder = null;

    const blob = new Blob(_chunks, { type: "audio/webm" });
    const now = new Date();
    const recordId = generateId();

    const savedRecord: TranscriptRecord = {
      id: recordId,
      title: `Recording ${now.toLocaleDateString("en-CA")}`,
      date: now.toISOString().slice(0, 10),
      rawTranscript: _textAccumulator.trim() || "(no speech detected)",
      utterances: [],
      status: "processing",
      createdAt: now.toISOString(),
    };

    // Zustand is accessible outside React via getState()
    const { addTranscript, updateTranscript } = useAppStore.getState();
    addTranscript(savedRecord);

    // Tell component where to navigate, reset active state
    _state = { isActive: false, mode: _state.mode, startedAt: 0, segments: [], interimText: "", pendingRecordId: recordId };
    _notify();

    // AssemblyAI diarization in background
    try {
      const result = await transcribeWithDiarization(blob, () => {});
      updateTranscript(recordId, { rawTranscript: result.text, utterances: result.utterances, status: "done" });
    } catch {
      updateTranscript(recordId, { status: "done" });
    }
  };

  recorder.start();
}

// -------------------------------------------------------
// Stop recording
// -------------------------------------------------------
export function stopRecording(): void {
  _isRecordingFlag = false;
  _recognition?.stop();
  if (_mediaRecorder && _mediaRecorder.state !== "inactive") {
    _mediaRecorder.stop();
  }
}
