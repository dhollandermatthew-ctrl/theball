import React, { useState, useEffect, useRef } from 'react';
import { Search, Calendar, User, X, ArrowRight } from 'lucide-react';
import { cn } from '../domain/utils';
import { format } from 'date-fns';
import { Task, OneOnOneItem, OneOnOnePerson } from '@/domain/types';


interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  items: OneOnOneItem[];
  people: OneOnOnePerson[];
  onNavigate: (view: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  tasks,
  items,
  people,
  onNavigate
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const filteredTasks = tasks.filter(t => 
    t.content.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const filteredItems = items.filter(i => 
    i.content.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const hasResults = filteredTasks.length > 0 || filteredItems.length > 0;

  const handleSelect = (view: string) => {
    onNavigate(view);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
          <Search className="text-slate-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, notes, or people..."
            className="flex-1 text-lg outline-none placeholder:text-slate-300 text-slate-700"
          />
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto bg-slate-50/50">
          {!query && (
            <div className="py-12 text-center text-slate-400 text-sm">
              Type to search across your calendar and 1:1 notes
            </div>
          )}

          {query && !hasResults && (
            <div className="py-8 text-center text-slate-500 text-sm">
              No results found for "{query}"
            </div>
          )}

          {query && hasResults && (
            <div className="py-2">
              
              {/* Task Results */}
              {filteredTasks.length > 0 && (
                <div className="mb-2">
                  <h3 className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Calendar Tasks
                  </h3>
                  {filteredTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => handleSelect('calendar')}
                      className="w-full text-left px-4 py-3 hover:bg-white hover:shadow-sm border-b border-transparent hover:border-slate-100 transition-all flex items-center gap-3 group"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded flex items-center justify-center shrink-0",
                        task.status === 'done' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                      )}>
                        <Calendar size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                          {task.content}
                        </p>
                        <p className="text-xs text-slate-400">
                          {task.date === 'inbox' ? 'Inbox' : format(new Date(task.date), 'MMM d, yyyy')} • {task.category}
                        </p>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                  ))}
                </div>
              )}

              {/* 1:1 Results */}
              {filteredItems.length > 0 && (
                <div>
                  <h3 className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    1:1 Notes
                  </h3>
                  {filteredItems.map(item => {
                    const person = people.find(p => p.id === item.personId);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.personId)}
                        className="w-full text-left px-4 py-3 hover:bg-white hover:shadow-sm border-b border-transparent hover:border-slate-100 transition-all flex items-center gap-3 group"
                      >
                        <div className={cn(
                          "w-8 h-8 rounded flex items-center justify-center shrink-0",
                          person?.avatarColor || "bg-slate-400",
                          "text-white"
                        )}>
                          <User size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                            {item.content}
                          </p>
                          <p className="text-xs text-slate-400">
                            1:1 with {person?.name || 'Unknown'} • {format(new Date(item.createdAt), 'MMM d')}
                          </p>
                        </div>
                         <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
            <span>Press ESC to close</span>
            <span>{filteredTasks.length + filteredItems.length} results</span>
        </div>
      </div>
    </div>
  );
};