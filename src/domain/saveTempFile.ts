import { writeBinaryFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory } from "@tauri-apps/api/path";

export async function saveTempFile(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const fileName = `audio_${Date.now()}.webm`;
  const filePath = fileName;

  await writeBinaryFile(
    { path: filePath, contents: buffer },
    { dir: BaseDirectory.Temp }
  );

  return filePath;
}