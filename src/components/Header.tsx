import React from 'react';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Briefcase,
  User,
  Inbox,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  CalendarDays,
  CheckCircle2,
  Zap,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

import { TaskCategory } from '@/domain/types';
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
  category: TaskCategory;
  weeklyStats: { total: number; done: number };
  isInboxOpen: boolean;
  inboxCount: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onCategoryChange: (category: TaskCategory) => void;
  onToggleInbox: () => void;
  onAIEntryClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentDate, 
  viewMode,
  category,
  weeklyStats,
  isInboxOpen,
  inboxCount,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
  onCategoryChange,
  onToggleInbox,
  onAIEntryClick,
}) => {
  // Use local helper instead of date-fns startOfWeek
  const start = getStartOfWeek(currentDate);
  
  const [totalTokens, setTotalTokens] = React.useState(0);
  const [isStatsOpen, setIsStatsOpen] = React.useState(false);
  const [showPriorityGuide, setShowPriorityGuide] = React.useState(false);
  const priorityGuideRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showPriorityGuide) return;
    const handler = (e: MouseEvent) => {
      if (priorityGuideRef.current && !priorityGuideRef.current.contains(e.target as Node)) {
        setShowPriorityGuide(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPriorityGuide]);

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
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm gap-4 shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 text-slate-800 min-w-[200px]">
          <div className="bg-slate-100 p-1.5 rounded-lg text-slate-600">
             <CalendarIcon size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
             {format(viewMode === 'week' ? start : currentDate, 'MMMM yyyy')}
          </h1>
        </div>

        {/* Navigation */}
        <div className="flex items-center bg-slate-100 rounded-md p-0.5">
            <button onClick={onPrev} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500 hover:text-slate-900" title="Previous">
                <ChevronLeft size={18} />
            </button>
            <button onClick={onNext} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500 hover:text-slate-900" title="Next">
                <ChevronRight size={18} />
            </button>
            <button
                onClick={onToday}
                className="ml-1 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:bg-white hover:text-blue-600 rounded transition-colors"
            >
              Today
            </button>
        </div>

        {/* View Toggle */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
            <button
                onClick={() => onViewModeChange('week')}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                    viewMode === 'week' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
            >
                <LayoutGrid size={14} />
                Week
            </button>
            <button
                onClick={() => onViewModeChange('month')}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                    viewMode === 'month' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
            >
                <CalendarDays size={14} />
                Month
            </button>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Category Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
  <button
    onClick={() => onCategoryChange('work')}
    className={cn(
      "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all tracking-wide",
      category === 'work'
        ? "bg-white text-slate-900 shadow-sm"
        : "text-slate-500 hover:text-slate-700"
    )}
  >
    <Briefcase
      size={14}
      className={cn(
        category === 'work' ? "text-blue-600" : "text-slate-400"
      )}
    />
    <span>Work</span>
  </button>

  <button
    onClick={() => onCategoryChange('personal')}
    className={cn(
      "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all uppercase tracking-wide",
      category === 'personal'
        ? "bg-white text-slate-900 shadow-sm"
        : "text-slate-500 hover:text-slate-700"
    )}
  >
    <User
      size={14}
      className={cn(
        category === 'personal' ? "text-indigo-500" : "text-slate-400"
      )}
    />
    <span>Personal</span>
  </button>
</div>

        {/* Center: Completed Counter */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <CheckCircle2 size={16} className="text-green-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                {weeklyStats.done} Completed
            </span>
        </div>

        {/* Priority Guide */}
        <div ref={priorityGuideRef} className="relative">
          <button
            onClick={() => setShowPriorityGuide((v) => !v)}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all cursor-pointer"
            title="Priority guide"
          >
            <HelpCircle size={15} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide hidden xl:inline">Priority</span>
          </button>

          {showPriorityGuide && (
            <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl p-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">How to rank tasks</div>
              <div className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                Ask two questions: <span className="font-semibold text-slate-700">Is someone waiting, or is there a hard deadline?</span> Then: <span className="font-semibold text-slate-700">Does this significantly advance a goal or relationship?</span>
              </div>
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="text-[11px] font-bold text-red-600 w-5 shrink-0 mt-0.5">P1</span>
                  <div>
                    <div className="text-[12px] font-semibold text-slate-800">Do today</div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">Someone is waiting, there's a hard deadline today or tomorrow, or another person/project is blocked without this.</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-[11px] font-bold text-amber-500 w-5 shrink-0 mt-0.5">P2</span>
                  <div>
                    <div className="text-[12px] font-semibold text-slate-800">Do this week</div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">Meaningful to a goal or relationship, but no one is blocked today. Can wait 2–3 days without real consequence.</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-[11px] font-bold text-slate-400 w-5 shrink-0 mt-0.5">P3</span>
                  <div>
                    <div className="text-[12px] font-semibold text-slate-800">Do when ready</div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">Low urgency, no one waiting. Can slip a week with no consequence. Nice to do, not must-do.</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 leading-relaxed">
                Hover any P badge on a card for a quick reminder.
              </div>
            </div>
          )}
        </div>

        {/* AI Quick Add Button */}
        <button
          onClick={onAIEntryClick}
          className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200 hover:border-purple-300 transition-all cursor-pointer"
          title="Quick Add Task (Cmd+Shift+N)"
        >
          <Sparkles size={16} className="text-purple-600" />
          <span className="text-xs font-bold text-purple-700 uppercase tracking-wide hidden xl:inline">
            Quick Add
          </span>
        </button>

        {/* Token Counter - Always Visible & Clickable */}
        <button
          onClick={() => setIsStatsOpen(true)}
          className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 hover:border-amber-300 transition-all cursor-pointer"
          title="View detailed token usage"
        >
          <Zap size={16} className="text-amber-600" />
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
            {totalTokens.toLocaleString()} tokens
          </span>
        </button>

        <button
            onClick={onToggleInbox}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border transition-all shadow-sm",
                isInboxOpen 
                ? "bg-blue-50 text-blue-700 border-blue-200" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
        >
            <Inbox size={16} />
            Inbox
            {inboxCount > 0 && (
                <span className={cn(
                    "ml-1 flex items-center justify-center text-[10px] font-bold h-5 min-w-[20px] px-1 rounded-full",
                    isInboxOpen ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                )}>
                    {inboxCount}
                </span>
            )}
        </button>
      </div>
    </header>
    </>
  );
};