import { useEffect, useState } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

declare const __APP_VERSION__: string;

const LATEST_JSON = 'https://github.com/dhollandermatthew-ctrl/theball/releases/latest/download/latest.json';

export function VersionIndicator() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [availableVersion, setAvailableVersion] = useState<string>('');
  const [installing, setInstalling] = useState(false);
  const [checkError, setCheckError] = useState<string>('');

  useEffect(() => {
    const t = setTimeout(async () => {
      // Try Tauri updater plugin first
      try {
        const u = await check();
        if (u?.available) {
          setUpdate(u);
          return;
        }
      } catch (e: any) {
        console.error('[Updater] check() failed:', e?.message || e);
        setCheckError(e?.message || String(e));
      }

      // Fallback: raw fetch to detect new version
      try {
        const res = await fetch(LATEST_JSON);
        const data = await res.json();
        if (data.version && data.version !== __APP_VERSION__) {
          setAvailableVersion(data.version);
        }
      } catch (e: any) {
        console.error('[Updater] fetch fallback failed:', e?.message || e);
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
    } catch (e: any) {
      console.error('[Updater] Install failed:', e);
      setInstalling(false);
    }
  };

  // Tauri updater works — one click install
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

  // Tauri updater failed but fetch found a new version — link to releases
  if (availableVersion) {
    return (
      <a
        href="https://github.com/dhollandermatthew-ctrl/theball/releases/latest"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-violet-500 hover:text-violet-700 font-medium leading-tight transition-colors"
      >
        Update to v{availableVersion} →
      </a>
    );
  }

  // Show error small if check failed (debug only)
  if (checkError) {
    return (
      <span className="text-xs text-slate-400 leading-tight" title={checkError}>
        v{__APP_VERSION__} ⚠
      </span>
    );
  }

  return (
    <span className="text-xs text-slate-400 leading-tight">
      v{__APP_VERSION__}
    </span>
  );
}
