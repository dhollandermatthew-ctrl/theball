// FILE: src/components/AITaskEntryModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Keyboard, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/domain/utils';
import { extractTaskFromNaturalLanguage, ExtractedTask } from '@/domain/ai/taskExtraction';
import { TaskPriority, TaskCategory } from '@/domain/types';
import { startRecording } from '@/domain/audioRecording';

interface AITaskEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (task: ExtractedTask) => void;
  existingTaskId?: string; // For expand mode
  existingTitle?: string; // Pre-fill for expand mode
}

export const AITaskEntryModal: React.FC<AITaskEntryModalProps> = ({
  isOpen,
  onClose,
  onCreateTask,
  existingTaskId,
  existingTitle,
}) => {
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedTask, setExtractedTask] = useState<ExtractedTask | null>(null);
  const [error, setError] = useState<string>('');
  const [previousTranscript, setPreviousTranscript] = useState<string>(''); // For additive re-recording

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const recordingControllerRef = useRef<{ stop: () => Promise<string> } | null>(null);

  const isExpandMode = !!existingTaskId;

  // Auto-start voice when modal opens (if voice mode)
  useEffect(() => {
    if (isOpen && mode === 'voice' && !isProcessing && !extractedTask && !isListening) {
      setTimeout(() => {
        handleStartListening();
      }, 300);
    }
  }, [isOpen, mode]);

  // Focus text area when switching to text mode
  useEffect(() => {
    if (mode === 'text' && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [mode]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInput('');
      setExtractedTask(null);
      setError('');
      setIsListening(false);
      setIsProcessing(false);
      setMode('voice');
      setPreviousTranscript('');
      
      // Stop recording if still active
      if (recordingControllerRef.current) {
        try {
          recordingControllerRef.current.stop().catch(() => {});
        } catch (e) {}
        recordingControllerRef.current = null;
      }
    }
  }, [isOpen]);

  const handleStartListening = async () => {
    setIsListening(true);
    setError('');
    
    try {
      console.log('[AITaskEntry] Starting audio recording...');
      const controller = startRecording();
      recordingControllerRef.current = controller;
      
    } catch (err: any) {
      console.error('[AITaskEntry] Recording start error:', err);
      setIsListening(false);
      setError(err.message || 'Failed to start recording. Check microphone permissions.');
    }
  };

  const handleStopListening = async () => {
    if (!recordingControllerRef.current) {
      setIsListening(false);
      return;
    }
    
    setIsListening(false);
    setIsProcessing(true);
    
    try {
      console.log('[AITaskEntry] Stopping recording and transcribing...');
      const transcript = await recordingControllerRef.current.stop();
      recordingControllerRef.current = null;
      
      console.log('[AITaskEntry] Got transcript:', transcript);
      
      // If re-recording (previousTranscript exists), append new transcript
      const combinedTranscript = previousTranscript 
        ? `${previousTranscript} ${transcript}` 
        : transcript;
      
      setInput(combinedTranscript);
      setPreviousTranscript(''); // Clear after using
      setIsProcessing(false);
      
      // Auto-process after speech
      handleProcess(combinedTranscript);
      
    } catch (err: any) {
      console.error('[AITaskEntry] Transcription error:', err);
      setIsProcessing(false);
      recordingControllerRef.current = null;
      setPreviousTranscript(''); // Clear on error
      const errorMsg = err?.message || JSON.stringify(err) || String(err);
      setError(`Error: ${errorMsg}`);
    }
  };

  const handleProcess = async (textInput?: string) => {
    const finalInput = textInput || input;
    
    if (!finalInput.trim()) {
      setError('Please provide task details');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // In expand mode, prepend existing title as context
      const contextualInput = isExpandMode && existingTitle
        ? `Task title: "${existingTitle}". Additional context: ${finalInput}`
        : finalInput;

      const result = await extractTaskFromNaturalLanguage(contextualInput);
      setExtractedTask(result);
    } catch (err) {
      console.error('[AITaskEntry] Extraction failed:', err);
      setError('Failed to process task. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreate = () => {
    if (!extractedTask) return;
    onCreateTask(extractedTask);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
    
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && mode === 'text') {
      e.preventDefault();
      handleProcess();
    }

    if (e.key === 'Enter' && extractedTask) {
      e.preventDefault();
      handleCreate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 pointer-events-none" onKeyDown={handleKeyDown}>
      {/* Modal */}
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <Sparkles className="text-purple-500" size={20} />
              <h2 className="text-lg font-semibold text-slate-900">
                {isExpandMode ? 'Add Task Details' : 'Quick Add Task'}
              </h2>
            </div>
            <p className="text-xs text-slate-400 ml-8">Cmd+Shift+N</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mode Toggle */}
            {!isProcessing && !extractedTask && (
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setMode('voice')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    mode === 'voice'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <Mic size={14} className="inline mr-1" />
                  Voice
                </button>
                <button
                  onClick={() => setMode('text')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    mode === 'text'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <Keyboard size={14} className="inline mr-1" />
                  Text
                </button>
              </div>
            )}
            
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 mb-3">{error}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setError('');
                    setMode('text');
                  }}
                  className="px-3 py-1.5 text-sm bg-white border border-red-300 text-red-700 rounded hover:bg-red-50"
                >
                  Switch to Text Mode
                </button>
                {(error.includes('denied') || error.includes('not-allowed')) && (
                  <button
                    onClick={() => {
                      setError('');
                      handleStartListening();
                    }}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Input Area */}
          {!extractedTask && (
            <>
              {mode === 'voice' ? (
                <div className="flex flex-col items-center justify-center py-12">
                  {isProcessing ? (
                    <>
                      <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mb-4 relative">
                        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                        <div className="absolute inset-0 rounded-full border-4 border-purple-300 border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
                      </div>
                      <p className="text-slate-700 font-semibold">Transcribing & extracting...</p>
                      <p className="text-slate-400 text-sm mt-1">This takes a few seconds</p>
                    </>
                  ) : isListening ? (
                    <>
                      <button
                        onClick={handleStopListening}
                        className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 flex items-center justify-center mb-4 shadow-lg transition-all duration-200"
                      >
                        {/* Pulsing rings */}
                        <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20"></div>
                        <div className="absolute inset-0 rounded-full bg-red-400 animate-pulse opacity-30"></div>
                        <Mic className="w-10 h-10 text-white relative z-10" />
                      </button>
                      <p className="text-slate-700 font-semibold text-lg">Recording...</p>
                      <p className="text-slate-500 text-sm mt-1">Click to stop or just finish speaking</p>
                      
                      {/* Visual audio indicator */}
                      <div className="mt-6 flex items-center justify-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-red-400 rounded-full animate-pulse"
                            style={{
                              height: `${12 + Math.random() * 16}px`,
                              animationDelay: `${i * 0.15}s`,
                              animationDuration: `${0.6 + Math.random() * 0.4}s`
                            }}
                          ></div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleStartListening}
                        className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 flex items-center justify-center mb-4 transition-all duration-200 hover:scale-110 hover:shadow-xl group"
                      >
                        {/* Subtle ring on hover */}
                        <div className="absolute inset-0 rounded-full border-2 border-purple-300 opacity-0 group-hover:opacity-100 transition-opacity scale-110"></div>
                        <Mic className="w-10 h-10 text-white relative z-10" />
                      </button>
                      <p className="text-slate-700 font-semibold text-lg">Click to speak</p>
                      <p className="text-slate-500 text-sm mt-1">Describe your task naturally</p>
                    </>
                  )}

                  {input && !isProcessing && !isListening && (
                    <div className="mt-6 w-full p-4 bg-slate-50 border border-slate-200 rounded-lg animate-in fade-in duration-300">
                      <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Transcript:</p>
                      <p className="text-sm text-slate-700">"{input}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <textarea
                    ref={textAreaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isExpandMode
                      ? "Add more context about this task..."
                      : "Describe your task... (e.g., 'Create vibe-coded UIUX component library, high priority, due Friday')"
                    }
                    className="w-full h-32 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-slate-900 placeholder:text-slate-400"
                  />
                  
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleProcess()}
                      disabled={!input.trim() || isProcessing}
                      className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Process
                        </>
                      )}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-slate-400 text-right">
                    Cmd+Enter to process
                  </p>
                </div>
              )}
            </>
          )}

          {/* Preview */}
          {extractedTask && (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-purple-700 mb-4">
                  Preview
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Title</label>
                    <input
                      type="text"
                      value={extractedTask.title}
                      onChange={(e) => setExtractedTask({ ...extractedTask, title: e.target.value })}
                      className="w-full px-4 py-2.5 text-slate-900 font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Description</label>
                    <textarea
                      value={extractedTask.description}
                      onChange={(e) => setExtractedTask({ ...extractedTask, description: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-shadow"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-2">Priority</label>
                      <div className="flex gap-2">
                        {(['p1', 'p2', 'p3'] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setExtractedTask({ ...extractedTask, priority: p })}
                            className={cn(
                              'flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-200',
                              extractedTask.priority === p
                                ? p === 'p1' 
                                  ? 'bg-red-500 text-white shadow-md ring-2 ring-red-200'
                                  : p === 'p2'
                                  ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-200'
                                  : 'bg-slate-500 text-white shadow-md ring-2 ring-slate-200'
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                            )}
                          >
                            {p.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-2">Date</label>
                      <input
                        type="date"
                        value={extractedTask.date}
                        onChange={(e) => setExtractedTask({ ...extractedTask, date: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 font-medium text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-shadow"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Category</label>
                    <div className="flex gap-2">
                      {(['work', 'personal'] as const).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setExtractedTask({ ...extractedTask, category: cat })}
                          className={cn(
                            'flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 capitalize',
                            extractedTask.category === cat
                              ? 'bg-purple-500 text-white shadow-md ring-2 ring-purple-200'
                              : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center gap-3">
                <button
                  onClick={() => {
                    // Store current transcript for additive re-recording
                    setPreviousTranscript(input);
                    setExtractedTask(null);
                    if (mode === 'voice') {
                      handleStartListening();
                    }
                  }}
                  disabled={isListening || isProcessing}
                  className="px-5 py-2.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-medium rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-purple-200"
                >
                  <Mic size={16} />
                  Add More
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Sparkles size={18} />
                  Create Task
                </button>
              </div>

              <p className="text-xs text-slate-400 text-center">
                Press Enter to create
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
