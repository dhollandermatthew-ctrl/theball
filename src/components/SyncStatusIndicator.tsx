// FILE: src/components/SyncStatusIndicator.tsx
import React, { useState, useEffect } from "react";
import { Cloud, CloudOff, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { getSyncStatus, triggerSync } from "@/db/sync";
import { isOnline, onOnlineStatusChange } from "@/db/offlineStorage";

export const SyncStatusIndicator: React.FC = () => {
  const [online, setOnline] = useState(isOnline());
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Update status periodically
    const interval = setInterval(() => {
      setSyncStatus(getSyncStatus());
    }, 2000);

    // Listen for online/offline changes
    const cleanup = onOnlineStatusChange((isOnline) => {
      setOnline(isOnline);
      setSyncStatus(getSyncStatus());
    });

    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    triggerSync();
    
    // Wait a bit for sync to complete
    setTimeout(() => {
      setSyncing(false);
      setSyncStatus(getSyncStatus());
    }, 2000);
  };

  // Determine status and styling
  let icon: React.ReactNode;
  let statusText: string;
  let colorClass: string;

  if (!online) {
    icon = <CloudOff className="w-4 h-4" />;
    statusText = syncStatus.pending > 0 
      ? `Offline (${syncStatus.pending} pending)` 
      : "Offline";
    colorClass = "text-amber-600";
  } else if (syncing) {
    icon = <Loader2 className="w-4 h-4 animate-spin" />;
    statusText = "Syncing...";
    colorClass = "text-blue-600";
  } else if (syncStatus.pending > 0) {
    icon = <AlertCircle className="w-4 h-4" />;
    statusText = `${syncStatus.pending} pending`;
    colorClass = "text-amber-600";
  } else {
    icon = <CheckCircle className="w-4 h-4" />;
    statusText = "Synced";
    colorClass = "text-green-600";
  }

  return (
    <button
      onClick={handleManualSync}
      disabled={!online || syncing}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg
        transition-all text-xs font-medium
        ${colorClass}
        hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed
      `}
      title={
        online 
          ? `Click to sync now. ${syncStatus.pending} operations pending.`
          : `${syncStatus.pending} operations will sync when online.`
      }
    >
      {icon}
      <span>{statusText}</span>
    </button>
  );
};
