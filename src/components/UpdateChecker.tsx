// FILE: src/components/UpdateChecker.tsx
// Checks for updates on launch and shows a non-intrusive banner.

import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [version, setVersion] = useState('');
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only run inside Tauri
    if (!(window as any).__TAURI_INTERNALS__) return;

    const checkForUpdate = async () => {
      try {
        const update = await check();
        if (update?.available) {
          setVersion(update.currentVersion !== update.version ? update.version : '');
          setUpdateAvailable(true);
        }
      } catch (e) {
        // Silently ignore — offline or no release yet
        console.log('[Updater] Check skipped:', e);
      }
    };

    // Check after a short delay so it doesn't block initial load
    const t = setTimeout(checkForUpdate, 3000);
    return () => clearTimeout(t);
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const update = await check();
      if (update?.available) {
        await update.downloadAndInstall();
        await relaunch();
      }
    } catch (e) {
      console.error('[Updater] Install failed:', e);
      setInstalling(false);
    }
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl border border-slate-700">
      <span>
        {version ? `The Ball ${version} is available` : 'A new version is available'}
      </span>
      <button
        onClick={handleInstall}
        disabled={installing}
        className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
      >
        {installing ? 'Installing…' : 'Update & Restart'}
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-slate-400 hover:text-white transition-colors text-xs"
      >
        Later
      </button>
    </div>
  );
}
