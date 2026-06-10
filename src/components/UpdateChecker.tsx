import { useEffect, useState } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';

// Kept in sync with tauri.conf.json — shown in dev mode where getVersion() is unavailable
const FALLBACK_VERSION = '0.1.5';

export function VersionIndicator() {
  const [currentVersion, setCurrentVersion] = useState<string>(FALLBACK_VERSION);
  const [update, setUpdate] = useState<Update | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Get real version from the installed binary
    getVersion().then(v => { if (v) setCurrentVersion(v); }).catch(() => {});

    // Check for updates — always runs, fails silently if offline/dev
    const t = setTimeout(async () => {
      try {
        const u = await check();
        if (u?.available) setUpdate(u);
      } catch {
        // offline or dev mode
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
      v{currentVersion}
    </span>
  );
}
