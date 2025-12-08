import { writeFile, BaseDirectory } from "@tauri-apps/plugin-fs";

export async function saveTempFile(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const fileName = `audio_${Date.now()}.webm`;

  await writeFile(fileName, buffer, {
    baseDir: BaseDirectory.Temp,
  });

  return fileName;
}