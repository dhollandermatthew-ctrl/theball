import { useEffect, useState } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

declare const __APP_VERSION__: string;

export function VersionIndicator() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const u = await check();
        if (u?.available) setUpdate(u);
      } catch {
        // offline or dev mode — silent
      }
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  const handleInstall = async () => {
    if (!update) return;
    setInstalling(true);
    try {
      await update.downloadAndInstall();
      await relaunch();
    } catch (e) {
      console.error('[Updater] Install failed:', e);
      setInstalling(false);
    }
  };

  if (update) {
    return (
      <button
        onClick={handleInstall}
        disabled={installing}
        className="text-left text-xs text-violet-500 hover:text-violet-700 disabled:opacity-50 font-medium leading-tight transition-colors"
      >
        {installing ? 'Installing…' : `Update to v${update.version} →`}
      </button>
    );
  }

  return (
    <span className="text-xs text-slate-400 leading-tight">
      v{__APP_VERSION__}
    </span>
  );
}
