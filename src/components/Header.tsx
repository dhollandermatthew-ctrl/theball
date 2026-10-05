import React from 'react';
import { format } from 'date-fns';
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  CalendarDays,
  CheckCircle2,
  Zap,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

import { cn } from '@/domain/utils';
import { tokenTracker } from '@/domain/tokenTracker';
import { TokenStatsModal } from './TokenStatsModal';

// Helper to replace missing startOfWeek from date-fns
const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday
  const diff = d.getDate() - day;
  d.setDate(diff);
  return d;
};

export type ViewMode = 'week' | 'month';

interface HeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  weeklyStats: { total: number; done: number };
  incompleteCount: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onAIEntryClick: () => void;
  onRollToNextWeek: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  viewMode,
  weeklyStats,
  incompleteCount,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
  onAIEntryClick,
  onRollToNextWeek,
}) => {
  const start = getStartOfWeek(currentDate);

  const [totalTokens, setTotalTokens] = React.useState(0);
  const [isStatsOpen, setIsStatsOpen] = React.useState(false);

  React.useEffect(() => {
    const updateTokens = () => {
      setTotalTokens(tokenTracker.getTotalTokens());
    };
    updateTokens();
    const unsubscribe = tokenTracker.subscribe(updateTokens);
    return () => {
      unsubscribe();
    };
  }, []);
  
  return (
    <>
      <TokenStatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm gap-3 shrink-0">
        {/* Left: date + nav + view toggle */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-slate-800 min-w-[160px]">
            {format(viewMode === 'week' ? start : currentDate, 'MMMM yyyy')}
          </h1>

          <div className="flex items-center bg-slate-100 rounded-md p-0.5">
            <button onClick={onPrev} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500 hover:text-slate-900" title="Previous">
              <ChevronLeft size={16} />
            </button>
            <button onClick={onNext} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500 hover:text-slate-900" title="Next">
              <ChevronRight size={16} />
            </button>
            <button
              onClick={onToday}
              className="ml-1 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-white hover:text-blue-600 rounded transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
            <button
              onClick={() => onViewModeChange('week')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
                viewMode === 'week' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutGrid size={13} />
              Week
            </button>
            <button
              onClick={() => onViewModeChange('month')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
                viewMode === 'month' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <CalendarDays size={13} />
              Month
            </button>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Work indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200">
            <Briefcase size={13} className="text-blue-600" />
            <span className="text-xs font-semibold text-slate-600">Work</span>
          </div>

          {/* Completed counter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <CheckCircle2 size={14} className="text-green-600" />
            <span className="text-xs font-semibold text-slate-600">
              {weeklyStats.done}
            </span>
          </div>

          {/* Roll to next week — only in week view when there are incomplete tasks */}
          {viewMode === 'week' && incompleteCount > 0 && (
            <button
              onClick={onRollToNextWeek}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
              title="Roll incomplete tasks to next week"
            >
              <ArrowRight size={13} />
              Roll
              <span className="bg-slate-600 text-slate-200 rounded px-1 text-[10px] font-bold">
                {incompleteCount}
              </span>
            </button>
          )}

          {/* Quick Add */}
          <button
            onClick={onAIEntryClick}
            className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 hover:border-purple-300 transition-all"
            title="Quick Add Task (Cmd+Shift+N)"
          >
            <Sparkles size={14} className="text-purple-600" />
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">
              Quick Add
            </span>
          </button>

          {/* Token counter */}
          <button
            onClick={() => setIsStatsOpen(true)}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 hover:border-amber-300 transition-all"
            title="View detailed token usage"
          >
            <Zap size={14} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-700">
              {totalTokens.toLocaleString()}
            </span>
          </button>
        </div>
      </header>
    </>
  );
};