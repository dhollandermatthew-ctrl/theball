// FILE: src/domain/fileStorage.ts
import { invoke } from '@tauri-apps/api/core';

// -------------------------------------------------------------
// Tauri-backed disk storage for Knowledge files
// Files live at: ~/Documents/The Ball/Knowledge/
// -------------------------------------------------------------

export async function saveKnowledgeFile(filename: string, data: Uint8Array): Promise<string> {
  return invoke<string>('save_knowledge_file', { filename, data: Array.from(data) });
}

export async function readKnowledgeFile(path: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>('read_knowledge_file', { path });
  return new Uint8Array(bytes);
}

export async function deleteKnowledgeFile(path: string): Promise<void> {
  return invoke('delete_knowledge_file', { path });
}

export async function openKnowledgeFile(path: string): Promise<void> {
  return invoke('open_knowledge_file', { path });
}

/**
 * Convert File to Base64 string for storage
 */
export async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary);
}

/**
 * Convert Base64 string back to downloadable Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: mimeType });
}

/**
 * Trigger download of a file from Base64 data
 */
export function downloadFile(base64: string, fileName: string, mimeType: string) {
  const blob = base64ToBlob(base64, mimeType);
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
