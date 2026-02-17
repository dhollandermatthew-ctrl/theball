// FILE: src/domain/tokenTracker.ts

export interface TokenUsage {
  prompt: number;
  response: number;
  total: number;
  timestamp: number;
  type: string;
  promptText?: string; // The actual text sent to AI
  systemPrompt?: string; // System instructions used
  latency?: number; // Response time in milliseconds
  promptLength?: number; // Character count of user input
  responseLength?: number; // Character count of AI response
}

const STORAGE_KEY = 'token_tracker_data';
const RESET_HOUR = 0; // Reset at midnight

interface StoredData {
  usageHistory: TokenUsage[];
  totalTokens: number;
  lastReset: number;
}

class TokenTracker {
  private usageHistory: TokenUsage[] = [];
  private listeners: Set<() => void> = new Set();
  private totalTokens = 0;
  private lastReset = Date.now();

  constructor() {
    this.loadFromStorage();
    this.checkDailyReset();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StoredData = JSON.parse(stored);
        this.usageHistory = data.usageHistory || [];
        this.totalTokens = data.totalTokens || 0;
        this.lastReset = data.lastReset || Date.now();
      }
    } catch (e) {
      console.error('Failed to load token tracker data:', e);
    }
  }

  private saveToStorage() {
    try {
      const data: StoredData = {
        usageHistory: this.usageHistory,
        totalTokens: this.totalTokens,
        lastReset: this.lastReset
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save token tracker data:', e);
    }
  }

  private checkDailyReset() {
    const now = new Date();
    const lastResetDate = new Date(this.lastReset);
    
    // Check if we've crossed midnight
    if (now.getDate() !== lastResetDate.getDate() || 
        now.getMonth() !== lastResetDate.getMonth() ||
        now.getFullYear() !== lastResetDate.getFullYear()) {
      this.reset();
    }
  }

  addUsage(usage: Omit<TokenUsage, 'timestamp'>) {
    this.checkDailyReset();
    
    const entry: TokenUsage = {
      ...usage,
      timestamp: Date.now()
    };
    this.usageHistory.push(entry);
    this.totalTokens += usage.total;
    
    // Clean up entries older than 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.usageHistory = this.usageHistory.filter(u => u.timestamp >= cutoff);
    
    this.saveToStorage();
    this.notifyListeners();
  }

  getHistory(): TokenUsage[] {
    // Filter to last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return this.usageHistory.filter(u => u.timestamp >= cutoff);
  }

  getTotalTokens(): number {
    // Calculate from last 24 hours only
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return this.usageHistory
      .filter(u => u.timestamp >= cutoff)
      .reduce((sum, u) => sum + u.total, 0);
  }

  getSessionStats() {
    const now = Date.now();
    const cutoff24h = now - 24 * 60 * 60 * 1000;
    const last24h = this.usageHistory.filter(u => u.timestamp >= cutoff24h);
    const lastHour = this.usageHistory.filter(u => now - u.timestamp < 3600000);
    
    return {
      total: last24h.reduce((sum, u) => sum + u.total, 0),
      lastHour: lastHour.reduce((sum, u) => sum + u.total, 0),
      count: last24h.length,
      byType: last24h.reduce((acc, u) => {
        acc[u.type] = (acc[u.type] || 0) + u.total;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  reset() {
    this.usageHistory = [];
    this.totalTokens = 0;
    this.lastReset = Date.now();
    this.saveToStorage();
    this.notifyListeners();
  }

  getLastResetTime(): number {
    return this.lastReset;
  }
}

export const tokenTracker = new TokenTracker();
