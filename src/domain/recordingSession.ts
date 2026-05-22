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
let _isRecordingFlag = false;
let _textAccumulator = "";

// AssemblyAI real-time streaming
let _realtimeWs: WebSocket | null = null;
let _realtimeStreamCtx: AudioContext | null = null;
let _realtimeProcessor: ScriptProcessorNode | null = null;

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

  // AssemblyAI real-time streaming — live captions
  // webkitSpeechRecognition is broken in Tauri's WKWebView; AssemblyAI WebSocket works reliably.
  _startRealtimeStreaming(streamToRecord);

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
    _stopRealtimeStreaming();
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
  _stopRealtimeStreaming();
  if (_mediaRecorder && _mediaRecorder.state !== "inactive") {
    _mediaRecorder.stop();
  }
}

// -------------------------------------------------------
// AssemblyAI real-time streaming helpers
// -------------------------------------------------------

function _startRealtimeStreaming(stream: MediaStream): void {
  const apiKey = (import.meta.env.VITE_ASSEMBLYAI_API_KEY as string) ?? "";
  if (!apiKey) {
    console.warn("[realtime] No AssemblyAI API key — live captions disabled");
    return;
  }

  // Get a short-lived token — browser WebSocket can't send Authorization headers
  fetch("https://api.assemblyai.com/v2/realtime/token", {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ expires_in: 3600 }),
  })
    .then((r) => {
      if (!r.ok) throw new Error(`Token ${r.status}`);
      return r.json();
    })
    .then(({ token }: { token: string }) => {
      const ws = new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`
      );
      _realtimeWs = ws;

      ws.onopen = () => {
        console.log("[realtime] connected");

        // Downsample to 16 kHz for AssemblyAI
        const ctx = new AudioContext({ sampleRate: 16000 });
        _realtimeStreamCtx = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        _realtimeProcessor = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
          }
          // base64-encode the raw PCM bytes
          const bytes = new Uint8Array(int16.buffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          ws.send(JSON.stringify({ audio_data: btoa(binary) }));
        };

        // Silent gain node — keeps the processing chain active without speaker feedback
        const silent = ctx.createGain();
        silent.gain.value = 0;
        source.connect(processor);
        processor.connect(silent);
        silent.connect(ctx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.message_type === "PartialTranscript" && msg.text?.trim()) {
            _state = { ..._state, interimText: msg.text };
            _notify();
          } else if (msg.message_type === "FinalTranscript" && msg.text?.trim()) {
            const text = msg.text.trim() as string;
            _textAccumulator += (_textAccumulator ? " " : "") + text;
            _state = { ..._state, segments: [..._state.segments, text], interimText: "" };
            _notify();
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = (e) => console.error("[realtime] error:", e);
      ws.onclose = (e) => console.log("[realtime] closed:", e.code, e.reason);
    })
    .catch((e) => console.warn("[realtime] setup failed:", e));
}

function _stopRealtimeStreaming(): void {
  try { _realtimeProcessor?.disconnect(); } catch { /* ignore */ }
  _realtimeProcessor = null;
  _realtimeStreamCtx?.close().catch(() => { /* ignore */ });
  _realtimeStreamCtx = null;

  if (_realtimeWs) {
    if (_realtimeWs.readyState === WebSocket.OPEN) {
      try { _realtimeWs.send(JSON.stringify({ terminate_session: true })); } catch { /* ignore */ }
      _realtimeWs.close();
    }
    _realtimeWs = null;
  }
}
