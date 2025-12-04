import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Search, X, ZoomIn, ZoomOut } from 'lucide-react';

import { OneOnOnePerson } from '@/domain/types';
import { cn } from '@/domain/utils';

interface SidebarProps {
  currentView: string;
  people: OneOnOnePerson[];
  onNavigate: (view: string) => void;
  onAddPerson: (name: string) => void;
  onDeletePerson: (id: string) => void;
  onSearchClick: () => void;
  isOpen: boolean;
  onClose: () => void;
  width?: number;
  onResizeStart?: (e: React.MouseEvent) => void;
  zoomLevel: number;
  onZoomChange: (level: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  people,
  onNavigate,
  onAddPerson,
  onDeletePerson,
  onSearchClick,
  isOpen,
  onClose,
  width = 256,
  onResizeStart,
  zoomLevel,
  onZoomChange
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  console.log("Sidebar mounted — people:", people);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📌 handleAddSubmit fired");
    console.log("📌 newName:", newName);

    if (newName.trim()) {
      console.log("📌 Calling onAddPerson...");
      onAddPerson(newName.trim());

      setNewName('');
      setIsAdding(false);
    } else {
      console.log("❌ newName was empty");
    }
  };

  const handleZoom = (delta: number) => {
    const newLevel = Math.min(Math.max(zoomLevel + delta, 0.7), 1.5);
    onZoomChange(Number(newLevel.toFixed(1)));
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 bg-slate-50 border-r border-slate-200 flex flex-col h-full shrink-0 shadow-xl md:shadow-none transition-transform duration-300 ease-in-out md:transition-none",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{
          width: window.innerWidth >= 768 ? width : '256px',
        }}
      >
        {/* Resize Handle */}
        <div
          className="hidden md:block absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-50 transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            onResizeStart?.(e);
          }}
        />

        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-200/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">WF</span>
            </div>
            <span className="font-semibold text-slate-700 truncate">The Ball</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 text-slate-400 hover:bg-slate-200 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Quick Find */}
          <div className="p-2">
            <button
              onClick={onSearchClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 border border-transparent hover:border-slate-200 transition-colors"
            >
              <Search size={18} className="text-slate-400" />
              Quick Find
            </button>
          </div>

          {/* Calendar */}
          <div className="px-2">
            <button
              onClick={() => onNavigate('calendar')}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                currentView === 'calendar'
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
              )}
            >
              <Calendar size={18} className="text-slate-400" />
              Calendar
            </button>
          </div>

          {/* One-on-Ones Header */}
          <div className="mt-4 px-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              One-on-Ones
            </span>

            <button
              onClick={() => setIsAdding(true)}
              className="p-1 hover:bg-slate-200 rounded text-slate-400"
              title="Add Person"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add Person Input */}
          {isAdding && (
            <form onSubmit={handleAddSubmit} className="px-3 mt-2">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name..."
                className="w-full text-sm px-2 py-1 rounded border border-slate-300 focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => {
                  console.log("key pressed:", e.key);
                  if (e.key === "Enter") e.stopPropagation();
                }}
              />
            </form>
          )}

          {/* People List */}
          <div className="flex-1 overflow-y-auto px-2 mt-2 pb-4 space-y-1">
            {people.map((p) => (
              <div key={p.id} className="relative group">
                <button
                  onClick={() => onNavigate(p.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                    currentView === p.id
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white",
                    p.avatarColor
                  )}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  {p.name}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete 1:1s with ${p.name}?`))
                      onDeletePerson(p.id);
                  }}
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition p-1 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {people.length === 0 && !isAdding && (
              <div className="px-4 py-3 text-xs text-slate-400 italic">
                No 1:1s yet. Click + to add.
              </div>
            )}
          </div>

          {/* Zoom */}
          <div className="p-3 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between bg-white p-1 rounded-md border border-slate-200 shadow-sm">
              <button onClick={() => handleZoom(-0.1)} className="p-1">
                <ZoomOut size={16} />
              </button>
              <span className="text-xs">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => handleZoom(0.1)} className="p-1">
                <ZoomIn size={16} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};