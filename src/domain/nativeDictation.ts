// FILE: src/domain/nativeDictation.ts
// Native macOS dictation via macOS Shortcuts app

import { Command } from '@tauri-apps/plugin-shell';

/**
 * Trigger native macOS dictation and return transcribed text.
 * 
 * SHORTCUT SETUP (in Shortcuts app):
 * 1. Find "BallDictate" shortcut (already created)
 * 2. Edit it to have these actions in order:
 *    a. "Dictate Text" (Stop Listening: After Pause)
 *    b. "Copy to Clipboard" (input: Dictated Text from previous action)
 * 3. Save and close
 * 
 * The shortcut dictates, copies to clipboard, and we read it.
 */
export async function nativeDictate(): Promise<string> {
  try {
    console.log('[NativeDictation] Calling macOS Shortcut...');
    
    // Call the shortcut - it will dictate and copy to clipboard
    const cmd = Command.create('run-shortcut', [
      '/usr/bin/shortcuts',
      'run',
      'BallDictate'
    ]);
    
    await cmd.execute();
    
    // Wait a moment for clipboard to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Read from clipboard
    const clipboardCmd = Command.create('read-clipboard', [
      '/usr/bin/pbpaste'
    ]);
    
    const output = await clipboardCmd.execute();
    
    if (output.code === 0 && output.stdout.trim()) {
      const text = output.stdout.trim();
      console.log('[NativeDictation] Success:', text);
      return text;
    }
    
    throw new Error('No text captured from dictation');
    
  } catch (err: any) {
    console.error('[NativeDictation] Error:', err);
    throw new Error(err.message || 'Failed to capture voice input');
  }
}
