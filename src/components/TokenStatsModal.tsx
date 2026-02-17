import React from 'react';
import { X, Zap, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { tokenTracker, TokenUsage } from '@/domain/tokenTracker';
import { formatDistanceToNow } from 'date-fns';

interface TokenStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TokenStatsModal: React.FC<TokenStatsModalProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = React.useState<TokenUsage[]>([]);
  const [stats, setStats] = React.useState({ total: 0, lastHour: 0, count: 0, byType: {} as Record<string, number> });
  const [lastReset, setLastReset] = React.useState(0);
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);
  const [detailViewUsage, setDetailViewUsage] = React.useState<TokenUsage | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setHistory(tokenTracker.getHistory());
      setStats(tokenTracker.getSessionStats());
      setLastReset(tokenTracker.getLastResetTime());
      setExpandedIndex(null);
    }
  }, [isOpen]);

  // Calculate AI product insights
  const insights = React.useMemo(() => {
    if (history.length === 0) return null;
    
    const withLatency = history.filter(h => h.latency);
    const avgLatency = withLatency.length > 0 
      ? withLatency.reduce((sum, h) => sum + (h.latency || 0), 0) / withLatency.length 
      : 0;
    
    const avgTokensPerChar = history
      .filter(h => h.promptLength)
      .map(h => (h.prompt / (h.promptLength || 1)))
      .reduce((sum, val, _, arr) => sum + val / arr.length, 0);
    
    const avgResponseEfficiency = history
      .filter(h => h.responseLength)
      .map(h => (h.response / (h.responseLength || 1)))
      .reduce((sum, val, _, arr) => sum + val / arr.length, 0);

    return {
      avgLatency: Math.round(avgLatency),
      fastest: Math.min(...withLatency.map(h => h.latency || Infinity)),
      slowest: Math.max(...withLatency.map(h => h.latency || -Infinity)),
      avgTokensPerChar,
      avgResponseEfficiency,
      interactionCount: history.length
    };
  }, [history]);

  if (!isOpen) return null;

  const nextReset = new Date(lastReset);
  nextReset.setDate(nextReset.getDate() + 1);
  nextReset.setHours(0, 0, 0, 0);

  // Detail View Modal
  if (detailViewUsage) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col">
          {/* Detail Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Zap className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Request Details</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {detailViewUsage.type}
                  </span>
                  {detailViewUsage.latency && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      detailViewUsage.latency < 2000 ? 'bg-green-100 text-green-700' :
                      detailViewUsage.latency < 5000 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {detailViewUsage.latency}ms
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {formatDistanceToNow(detailViewUsage.timestamp, { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setDetailViewUsage(null)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          {/* Token Stats Bar */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border-b border-slate-200">
            <div className="text-center">
              <div className="text-xs text-slate-500 mb-1">Prompt Tokens</div>
              <div className="text-lg font-bold text-blue-600">{detailViewUsage.prompt.toLocaleString()}</div>
              {detailViewUsage.promptLength && (
                <div className="text-xs text-slate-400">{detailViewUsage.promptLength} chars</div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500 mb-1">Response Tokens</div>
              <div className="text-lg font-bold text-emerald-600">{detailViewUsage.response.toLocaleString()}</div>
              {detailViewUsage.responseLength && (
                <div className="text-xs text-slate-400">{detailViewUsage.responseLength} chars</div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500 mb-1">Total Tokens</div>
              <div className="text-lg font-bold text-slate-900">{detailViewUsage.total.toLocaleString()}</div>
              {detailViewUsage.promptLength && detailViewUsage.responseLength && (
                <div className="text-xs text-slate-400">
                  {((detailViewUsage.total) / (detailViewUsage.promptLength + detailViewUsage.responseLength)).toFixed(2)} tokens/char
                </div>
              )}
            </div>
          </div>

          {/* Detail Content - Large Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {detailViewUsage.systemPrompt && (
              <div>
                <div className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded"></div>
                  System Prompt
                </div>
                <div className="bg-slate-900 rounded-lg p-6 text-sm text-slate-100 font-mono whitespace-pre-wrap leading-relaxed">
                  {detailViewUsage.systemPrompt}
                </div>
              </div>
            )}
            {detailViewUsage.promptText && (
              <div>
                <div className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-emerald-500 rounded"></div>
                  User Input
                </div>
                <div className="bg-slate-900 rounded-lg p-6 text-sm text-slate-100 font-mono whitespace-pre-wrap leading-relaxed">
                  {detailViewUsage.promptText}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
            <button
              onClick={() => setDetailViewUsage(null)}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Zap className="text-amber-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Token Usage</h2>
              <p className="text-sm text-slate-500">Last 24 hours of AI activity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200">
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-600 text-xs mb-0.5">
              <TrendingUp size={14} />
              <span>Last 24h</span>
            </div>
            <div className="text-xl font-bold text-slate-900">
              {stats.total.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-600 text-xs mb-0.5">
              <Clock size={14} />
              <span>Last Hour</span>
            </div>
            <div className="text-xl font-bold text-slate-900">
              {stats.lastHour.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-600 text-xs mb-0.5">
              <BarChart3 size={14} />
              <span>API Calls</span>
            </div>
            <div className="text-xl font-bold text-slate-900">
              {stats.count}
            </div>
          </div>
        </div>

        {/* By Type Breakdown */}
        {Object.keys(stats.byType).length > 0 && (
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Usage by Type
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byType).map(([type, tokens]) => (
                <div key={type} className="flex items-center gap-2 bg-white rounded px-3 py-1.5 border border-slate-200 text-xs">
                  <span className="font-medium text-slate-600">{type}</span>
                  <span className="font-bold text-slate-900">{tokens.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Product Insights */}
        {insights && insights.avgLatency > 0 && (
          <div className="px-4 py-3 border-b border-slate-200 bg-blue-50">
            <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Zap size={14} className="text-blue-600" />
              Performance Insights
            </h3>
            <div className="flex gap-3 text-xs overflow-x-auto">
              <div className="bg-white rounded px-3 py-2 border border-blue-100 whitespace-nowrap">
                <div className="text-slate-500 mb-0.5">Avg Latency</div>
                <div className="font-bold text-sm text-slate-900">{insights.avgLatency}ms</div>
              </div>
              <div className="bg-white rounded px-3 py-2 border border-blue-100 whitespace-nowrap">
                <div className="text-slate-500 mb-0.5">Range</div>
                <div className="font-bold text-xs text-slate-900">
                  {insights.fastest}-{insights.slowest}ms
                </div>
              </div>
              <div className="bg-white rounded px-3 py-2 border border-blue-100 whitespace-nowrap">
                <div className="text-slate-500 mb-0.5">Efficiency</div>
                <div className="font-bold text-xs text-slate-900">
                  {insights.avgTokensPerChar.toFixed(2)} t/c
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-indigo-500 rounded"></div>
            Recent Activity
          </h3>
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Zap size={48} className="mx-auto mb-3 opacity-50" />
              <p>No AI usage yet today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...history].reverse().map((usage, idx) => (
                <div key={idx}>
                  <button
                    onClick={() => (usage.promptText || usage.systemPrompt) && setDetailViewUsage(usage)}
                    className="w-full bg-white rounded-lg p-4 border-2 border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {usage.type}
                        </span>
                        {usage.latency && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            usage.latency < 2000 ? 'bg-green-100 text-green-700' :
                            usage.latency < 5000 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {usage.latency}ms
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {formatDistanceToNow(usage.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-slate-500 mb-0.5">Prompt</div>
                        <div className="font-semibold text-blue-600">{usage.prompt.toLocaleString()}</div>
                        {usage.promptLength && (
                          <div className="text-xs text-slate-400">{usage.promptLength} chars</div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-0.5">Response</div>
                        <div className="font-semibold text-emerald-600">{usage.response.toLocaleString()}</div>
                        {usage.responseLength && (
                          <div className="text-xs text-slate-400">{usage.responseLength} chars</div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-0.5">Total</div>
                        <div className="font-semibold text-slate-900">{usage.total.toLocaleString()}</div>
                        {usage.promptLength && usage.responseLength && (
                          <div className="text-xs text-slate-400">
                            {((usage.total) / (usage.promptLength + usage.responseLength)).toFixed(2)} t/c
                          </div>
                        )}
                      </div>
                    </div>
                    {(usage.promptText || usage.systemPrompt) && (
                      <div className="mt-3 pt-3 border-t border-slate-200 group-hover:border-indigo-200 transition-colors">
                        <div className="text-xs font-medium text-indigo-600 group-hover:text-indigo-700 flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center text-indigo-600">
                            →
                          </div>
                          Click to view full request details
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
          <p className="text-xs text-slate-500">
            Shows AI usage from the last 24 hours • Rolling window updates continuously
          </p>
        </div>
      </div>
    </div>
  );
};
