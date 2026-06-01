// FILE: src/db/offlineStorage.ts
// Offline-first localStorage backup layer

import type { 
  Task, 
  OneOnOneItem, 
  OneOnOnePerson, 
  Goal,
  MeetingSpace,
  HealthData,
  ProductKnowledgeItem,
  TranscriptRecord,
} from "@/domain/types";

const STORAGE_KEYS = {
  TASKS: 'theball-offline-tasks',
  PEOPLE: 'theball-offline-people',
  ONEONONES: 'theball-offline-oneonones',
  GOALS: 'theball-offline-goals',
  MEETINGS: 'theball-offline-meetings',
  HEALTH: 'theball-offline-health',
  KNOWLEDGE: 'theball-offline-knowledge',
  TRANSCRIPTS: 'theball-offline-transcripts',
  SYNC_QUEUE: 'theball-sync-queue',
  LAST_SYNC: 'theball-last-sync',
} as const;

export interface OfflineData {
  tasks: Task[];
  people: OneOnOnePerson[];
  oneOnOnes: Record<string, OneOnOneItem[]>;
  goals: Goal[];
  meetingSpaces: MeetingSpace[];
  healthData: HealthData;
  productKnowledge: ProductKnowledgeItem[];
  transcripts: TranscriptRecord[];
  lastSync: number;
}

// ==================== BACKUP TO LOCALSTORAGE ====================

export function backupToLocalStorage(data: Partial<OfflineData>) {
  try {
    if (data.tasks !== undefined) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
    }
    if (data.people !== undefined) {
      localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(data.people));
    }
    if (data.oneOnOnes !== undefined) {
      localStorage.setItem(STORAGE_KEYS.ONEONONES, JSON.stringify(data.oneOnOnes));
    }
    if (data.goals !== undefined) {
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(data.goals));
    }
    if (data.meetingSpaces !== undefined) {
      localStorage.setItem(STORAGE_KEYS.MEETINGS, JSON.stringify(data.meetingSpaces));
    }
    if (data.healthData !== undefined) {
      localStorage.setItem(STORAGE_KEYS.HEALTH, JSON.stringify(data.healthData));
    }
    if (data.productKnowledge !== undefined) {
      localStorage.setItem(STORAGE_KEYS.KNOWLEDGE, JSON.stringify(data.productKnowledge));
    }
    if (data.transcripts !== undefined) {
      localStorage.setItem(STORAGE_KEYS.TRANSCRIPTS, JSON.stringify(data.transcripts));
    }
    
    // Update last backup timestamp
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
  } catch (error) {
    console.error('[Offline] Failed to backup to localStorage:', error);
  }
}

// ==================== LOAD FROM LOCALSTORAGE ====================

export function loadFromLocalStorage(): OfflineData | null {
  try {
    const tasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    const people = localStorage.getItem(STORAGE_KEYS.PEOPLE);
    const oneOnOnes = localStorage.getItem(STORAGE_KEYS.ONEONONES);
    const goals = localStorage.getItem(STORAGE_KEYS.GOALS);
    const meetings = localStorage.getItem(STORAGE_KEYS.MEETINGS);
    const health = localStorage.getItem(STORAGE_KEYS.HEALTH);
    const knowledge = localStorage.getItem(STORAGE_KEYS.KNOWLEDGE);
    const transcripts = localStorage.getItem(STORAGE_KEYS.TRANSCRIPTS);
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);

    // If no data exists, return null
    if (!tasks && !people && !goals && !meetings) {
      return null;
    }

    return {
      tasks: tasks ? JSON.parse(tasks) : [],
      people: people ? JSON.parse(people) : [],
      oneOnOnes: oneOnOnes ? JSON.parse(oneOnOnes) : {},
      goals: goals ? JSON.parse(goals) : [],
      meetingSpaces: meetings ? JSON.parse(meetings) : [],
      healthData: health ? JSON.parse(health) : { bloodWorkRecords: [], workoutRecords: [] },
      productKnowledge: knowledge ? JSON.parse(knowledge) : [],
      transcripts: transcripts ? JSON.parse(transcripts) : [],
      lastSync: lastSync ? parseInt(lastSync, 10) : 0,
    };
  } catch (error) {
    console.error('[Offline] Failed to load from localStorage:', error);
    return null;
  }
}

// ==================== SYNC QUEUE PERSISTENCE ====================

export interface QueuedChange {
  id: string; // Unique ID for deduplication
  timestamp: number;
  change: any; // The actual Change object
  retryCount: number;
}

export function saveQueueToLocalStorage(queue: QueuedChange[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    console.log(`[Offline] Saved ${queue.length} items to sync queue`);
  } catch (error) {
    console.error('[Offline] Failed to save sync queue:', error);
  }
}

export function loadQueueFromLocalStorage(): QueuedChange[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
    if (!stored) return [];
    
    const queue = JSON.parse(stored) as QueuedChange[];
    console.log(`[Offline] Loaded ${queue.length} items from sync queue`);
    return queue;
  } catch (error) {
    console.error('[Offline] Failed to load sync queue:', error);
    return [];
  }
}

export function clearSyncQueue() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
    console.log('[Offline] Cleared sync queue');
  } catch (error) {
    console.error('[Offline] Failed to clear sync queue:', error);
  }
}

// ==================== ONLINE/OFFLINE DETECTION ====================

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onOnlineStatusChange(callback: (online: boolean) => void) {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
