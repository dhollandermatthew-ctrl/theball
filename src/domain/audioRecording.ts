// FILE: src/domain/audioRecording.ts
// Audio recording via browser MediaRecorder API + Whisper transcription

import { invoke } from '@tauri-apps/api/core';

/**
 * Record audio from microphone and transcribe via Whisper API.
 * Returns the transcribed text.
 */
export async function recordAndTranscribe(): Promise<string> {
  console.log('[AudioRecording] Starting...');
  
  // Request microphone access
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  return new Promise<string>((resolve, reject) => {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm'
    });
    
    const audioChunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      console.log('[AudioRecording] Recording stopped, processing...');
      
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
      
      try {
        // Combine audio chunks into single blob
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Convert to array buffer
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBytes = Array.from(new Uint8Array(arrayBuffer));
        
        console.log('[AudioRecording] Audio size:', audioBytes.length, 'bytes');
        
        // Get Groq API key from env
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKey) {
          throw new Error('Groq API key not configured in .env file');
        }
        
        // Send to Tauri backend for Whisper transcription
        console.log('[AudioRecording] Sending to Whisper API...');
        const transcript = await invoke<string>('transcribe_audio', {
          audio: audioBytes,
          apiKey: apiKey
        });
        
        console.log('[AudioRecording] Transcript:', transcript);
        
        if (!transcript || !transcript.trim()) {
          throw new Error('No speech detected in recording');
        }
        
        resolve(transcript.trim());
        
      } catch (err: any) {
        console.error('[AudioRecording] Transcription error:', err);
        reject(new Error(err.message || 'Failed to transcribe audio'));
      }
    };
    
    mediaRecorder.onerror = (event: any) => {
      console.error('[AudioRecording] MediaRecorder error:', event.error);
      stream.getTracks().forEach(track => track.stop());
      reject(new Error('Recording failed: ' + event.error));
    };
    
    // Start recording
    console.log('[AudioRecording] Starting MediaRecorder...');
    mediaRecorder.start();
    
    // Auto-stop after 10 seconds (safety limit)
    const timeout = setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        console.log('[AudioRecording] Auto-stopping after 10 seconds');
        mediaRecorder.stop();
      }
    }, 10000);
    
    // Expose stop function to external callers
    (mediaRecorder as any).stopRecording = () => {
      clearTimeout(timeout);
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    };
  });
}

/**
 * Start recording and return a controller to stop it.
 * Auto-stops after 4 seconds of silence.
 */
export function startRecording(): {
  stop: () => Promise<string>;
  recorder: MediaRecorder | null;
} {
  let mediaRecorderRef: MediaRecorder | null = null;
  let audioContextRef: AudioContext | null = null;
  let analyserRef: AnalyserNode | null = null;
  let silenceTimeoutRef: number | null = null;
  let checkIntervalRef: number | null = null;
  
  const transcriptPromise = new Promise<string>((resolve, reject) => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm'
        });
        
        mediaRecorderRef = mediaRecorder;
        
        // Setup audio analysis for silence detection
        audioContextRef = new AudioContext();
        const source = audioContextRef.createMediaStreamSource(stream);
        analyserRef = audioContextRef.createAnalyser();
        analyserRef.fftSize = 512;
        analyserRef.smoothingTimeConstant = 0.8;
        source.connect(analyserRef);
        
        const dataArray = new Uint8Array(analyserRef.frequencyBinCount);
        let lastSoundTime = Date.now();
        const SILENCE_THRESHOLD = 30; // Volume threshold (0-255)
        const SILENCE_DURATION = 4000; // 4 seconds of silence
        
        // Check audio levels every 100ms
        checkIntervalRef = window.setInterval(() => {
          if (!analyserRef || mediaRecorder.state !== 'recording') {
            return;
          }
          
          analyserRef.getByteFrequencyData(dataArray);
          
          // Calculate average volume
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          
          if (average > SILENCE_THRESHOLD) {
            // Sound detected - reset silence timer
            lastSoundTime = Date.now();
            if (silenceTimeoutRef) {
              window.clearTimeout(silenceTimeoutRef);
              silenceTimeoutRef = null;
            }
          } else {
            // Silence detected - check if we've been silent long enough
            const silenceDuration = Date.now() - lastSoundTime;
            
            if (silenceDuration >= SILENCE_DURATION && !silenceTimeoutRef) {
              // Auto-stop after silence
              console.log('[AudioRecording] Auto-stopping after 4s silence');
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
            }
          }
        }, 100);
        
        const audioChunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          console.log('[AudioRecording] Recording stopped, transcribing...');
          
          // Cleanup
          if (checkIntervalRef) window.clearInterval(checkIntervalRef);
          if (silenceTimeoutRef) window.clearTimeout(silenceTimeoutRef);
          if (audioContextRef) audioContextRef.close();
          stream.getTracks().forEach(track => track.stop());
          
          try {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioBytes = Array.from(new Uint8Array(arrayBuffer));
            
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) {
              reject(new Error('Groq API key not configured'));
              return;
            }
            
            const transcript = await invoke<string>('transcribe_audio', {
              audio: audioBytes,
              apiKey: apiKey
            });
            
            if (!transcript || !transcript.trim()) {
              reject(new Error('No speech detected'));
              return;
            }
            
            resolve(transcript.trim());
            
          } catch (err: any) {
            const errorMsg = err?.message || String(err);
            reject(new Error(`Transcription failed: ${errorMsg}`));
          }
        };
        
        mediaRecorder.onerror = (event: any) => {
          if (checkIntervalRef) window.clearInterval(checkIntervalRef);
          if (silenceTimeoutRef) window.clearTimeout(silenceTimeoutRef);
          if (audioContextRef) audioContextRef.close();
          stream.getTracks().forEach(track => track.stop());
          reject(new Error('Recording failed: ' + event.error));
        };
        
        mediaRecorder.start();
        console.log('[AudioRecording] Recording started with silence detection (4s threshold)');
        
      } catch (err) {
        reject(err);
      }
    })();
  });
  
  return {
    stop: () => {
      if (checkIntervalRef) window.clearInterval(checkIntervalRef);
      if (silenceTimeoutRef) window.clearTimeout(silenceTimeoutRef);
      if (audioContextRef) audioContextRef.close();
      if (mediaRecorderRef && mediaRecorderRef.state === 'recording') {
        mediaRecorderRef.stop();
      }
      return transcriptPromise;
    },
    recorder: mediaRecorderRef
  };
}
