// FILE: src/domain/tokenTracker.ts

export interface TokenUsage {
  prompt: number;
  response: number;
  total: number;
  timestamp: number;
  type: string;
  category: 'vision' | 'analysis'; // vision = image/PDF uploads, analysis = text/chat
  promptText?: string; // The actual text sent to AI
  systemPrompt?: string; // System instructions used
  latency?: number; // Response time in milliseconds
  promptLength?: number; // Character count of user input
  responseLength?: number; // Character count of AI response
}

const STORAGE_KEY = 'token_tracker_data';
// Gemini free tier: 20 requests per 24 hours (rolling)
const FREE_TIER_REQUESTS_24H = 20;

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
        
        // Clean up old entries (older than 24 hours)
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        this.usageHistory = this.usageHistory.filter(u => u.timestamp >= cutoff);
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
    // Clean up entries older than 24 hours (rolling window)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.usageHistory = this.usageHistory.filter(u => u.timestamp >= cutoff);
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
    // Calculate from last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return this.usageHistory
      .filter(u => u.timestamp >= cutoff)
      .reduce((sum, u) => sum + u.total, 0);
  }

  // Get requests in the last 24 hours
  getRequestsLast24Hours(): number {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return this.usageHistory.filter(u => u.timestamp >= cutoff).length;
  }

  // Check if we're at/near the 24-hour limit
  isNearLimit(): boolean {
    return this.getRequestsLast24Hours() >= FREE_TIER_REQUESTS_24H * 0.8; // 80% threshold (16/20)
  }

  getSessionStats() {
    const now = Date.now();
    const cutoff24h = now - 24 * 60 * 60 * 1000;
    const cutoffHour = now - 60 * 60 * 1000;
    
    const last24h = this.usageHistory.filter(u => u.timestamp >= cutoff24h);
    const lastHour = this.usageHistory.filter(u => u.timestamp >= cutoffHour);
    
    // Group by category
    const byCategory = last24h.reduce((acc, u) => {
      const cat = u.category || 'analysis';
      if (!acc[cat]) {
        acc[cat] = { tokens: 0, requests: 0 };
      }
      acc[cat].tokens += u.total;
      acc[cat].requests += 1;
      return acc;
    }, {} as Record<string, { tokens: number; requests: number }>);
    
    return {
      total: last24h.reduce((sum, u) => sum + u.total, 0),
      lastHour: lastHour.reduce((sum, u) => sum + u.total, 0),
      count: last24h.length,
      byType: last24h.reduce((acc, u) => {
        acc[u.type] = (acc[u.type] || 0) + u.total;
        return acc;
      }, {} as Record<string, number>),
      byCategory,
      requestLimit: {
        current: last24h.length,
        max: FREE_TIER_REQUESTS_24H,
        percentage: (last24h.length / FREE_TIER_REQUESTS_24H) * 100
      }
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
