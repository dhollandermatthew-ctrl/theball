import { useEffect, useState } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';

export function VersionIndicator() {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [update, setUpdate] = useState<Update | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!(window as any).__TAURI_INTERNALS__) return;

    getVersion().then(setCurrentVersion).catch(() => {});

    const t = setTimeout(async () => {
      try {
        const u = await check();
        if (u?.available) setUpdate(u);
      } catch {
        // offline or no release yet — silent
      }
    }, 3000);

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

  if (!currentVersion) return null;

  return (
    <div className="px-4 pb-3 pt-0.5">
      {update ? (
        <button
          onClick={handleInstall}
          disabled={installing}
          className="text-xs text-violet-500 hover:text-violet-600 disabled:opacity-50 transition-colors font-medium"
        >
          {installing ? 'Installing…' : `v${currentVersion} · Update to ${update.version} →`}
        </button>
      ) : (
        <span className="text-xs text-slate-400">
          v{currentVersion}
        </span>
      )}
    </div>
  );
}
