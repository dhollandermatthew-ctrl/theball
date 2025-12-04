import React from 'react';
import { 
  endOfMonth, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameMonth, 
  isToday 
} from 'date-fns';

/* 🔥 FIXED ABSOLUTE IMPORTS */
import { Task, TaskCategory } from '@/domain/types';
import { cn, formatDateKey } from '@/domain/utils';

interface MonthViewProps {
  currentDate: Date;
  tasks: Task[];
  category: TaskCategory;
  onDateClick: (date: Date) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({ 
  currentDate, 
  tasks, 
  category, 
  onDateClick 
}) => {
  // Replacement for startOfMonth(currentDate)
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = endOfMonth(monthStart);
  
  // Replacement for startOfWeek(monthStart)
  const startDate = new Date(monthStart);
  startDate.setDate(monthStart.getDate() - monthStart.getDay());
  
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Strip HTML tags for simplified view
  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden animate-in fade-in duration-300">
      {/* Days Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-[minmax(120px,1fr)] overflow-y-auto"> 
        {days.map(day => {
            const dateKey = formatDateKey(day);
            const dayTasks = tasks.filter(t => t.date === dateKey && t.category === category);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isDayToday = isToday(day);

            return (
                <div 
                    key={dateKey}
                    onClick={() => onDateClick(day)}
                    className={cn(
                        "border-b border-r border-slate-100 p-2 cursor-pointer transition-colors flex flex-col gap-1 group relative",
                        !isCurrentMonth ? "bg-slate-50/50 text-slate-400" : "hover:bg-blue-50/20 bg-white"
                    )}
                >
                    {/* Date Number */}
                    <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                            "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-all",
                            isDayToday ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 group-hover:bg-slate-100"
                        )}>
                            {format(day, 'd')}
                        </span>
                    </div>

                    {/* Tasks List */}
                    <div className="flex flex-col gap-1 w-full">
                        {dayTasks.slice(0, 4).map(task => {
                            const isDone = task.status === 'done';
                            const plainText = stripHtml(task.content) || 'Untitled Task';
                            
                            return (
                                <div key={task.id} className={cn(
                                    "text-[10px] truncate px-1.5 py-0.5 rounded border border-l-[3px] shadow-sm select-none",
                                    isDone ? "bg-slate-100 border-slate-200 text-slate-400 border-l-slate-300 decoration-slate-400 line-through" : 
                                    task.priority === 'high' ? "bg-red-50 border-red-100 text-red-800 border-l-red-500" :
                                    task.priority === 'medium' ? "bg-amber-50 border-amber-100 text-amber-800 border-l-amber-500" :
                                    "bg-white border-slate-100 text-slate-600 border-l-blue-400"
                                )}>
                                    {plainText}
                                </div>
                            );
                        })}
                        {dayTasks.length > 4 && (
                            <span className="text-[10px] font-medium text-slate-400 pl-1">
                                +{dayTasks.length - 4} more
                            </span>
                        )}
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};