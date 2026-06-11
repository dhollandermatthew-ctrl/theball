import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Search, Upload, FileText, Plus, Tag, Trash2, X, Sparkles,
  ChevronLeft, ChevronRight, BookOpen, Briefcase, Brain, Wrench,
  Layers, Send, Loader2, FileIcon, Edit3, ArrowLeft,
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { useAppStore } from '@/domain/state';
import { ProductKnowledgeItem, KnowledgeCollection, KNOWLEDGE_COLLECTIONS } from '@/domain/types';
import { generateId } from '@/domain/utils';
import { extractText } from '@/domain/extractText';
import { fileToBase64, formatFileSize } from '@/domain/fileStorage';
import { suggestTags } from '@/domain/ai/suggestTags';
import { askKnowledgeBase, KnowledgeAnswer } from '@/domain/ai/knowledgeAsk';
import { WysiwygEditor } from './WysiwygEditor';

// ── helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || d.innerText || '';
}

const COLLECTION_META: Record<KnowledgeCollection, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  'product': {
    label: 'Product',
    icon: <BookOpen size={14} />,
    bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200',
  },
  'personal-growth': {
    label: 'Personal Growth',
    icon: <Brain size={14} />,
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
  },
  'ai-tools': {
    label: 'AI & Tools',
    icon: <Wrench size={14} />,
    bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200',
  },
  'work-docs': {
    label: 'Work Docs',
    icon: <Briefcase size={14} />,
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
  },
};

function CollectionBadge({ collection }: { collection?: KnowledgeCollection }) {
  if (!collection) return null;
  const m = COLLECTION_META[collection];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${m.bg} ${m.text} ${m.border}`}>
      {m.icon}{m.label}
    </span>
  );
}

// ── upload modal ──────────────────────────────────────────────────────────────

interface UploadModalProps {
  file: File;
  onSave: (title: string, collection: KnowledgeCollection | undefined, tags: string[]) => void;
  onCancel: () => void;
  extractedContent: string;
}

function UploadModal({ file, onSave, onCancel, extractedContent }: UploadModalProps) {
  const [title, setTitle] = useState(file.name.replace(/\.[^.]+$/, ''));
  const [collection, setCollection] = useState<KnowledgeCollection | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loadingTags, setLoadingTags] = useState(false);

  useEffect(() => {
    setLoadingTags(true);
    suggestTags(file.name, extractedContent.substring(0, 2000))
      .then(setTags)
      .catch(() => {})
      .finally(() => setLoadingTags(false));
  }, []);

  const addTag = (t: string) => {
    const clean = t.trim().toLowerCase();
    if (clean && !tags.includes(clean)) setTags((prev) => [...prev, clean]);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Add to Knowledge Base</h2>
          <p className="text-sm text-slate-500 mt-1 truncate">{file.name} · {formatFileSize(file.size)}</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Collection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Collection</label>
            <div className="grid grid-cols-2 gap-2">
              {KNOWLEDGE_COLLECTIONS.map((c) => {
                const m = COLLECTION_META[c.id];
                const selected = collection === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCollection(selected ? '' : c.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      selected ? `${m.bg} ${m.text} ${m.border} border-2` : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m.icon}{m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              Tags
              {loadingTags && <Loader2 size={12} className="animate-spin text-slate-400" />}
              {!loadingTags && tags.length > 0 && (
                <span className="text-xs text-slate-400 font-normal">AI suggested</span>
              )}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                  {tag}
                  <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="hover:text-red-500">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(tagInput);
                  setTagInput('');
                }
              }}
              placeholder="Add tag, press Enter…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="p-6 pt-0 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => onSave(title.trim() || file.name, collection as KnowledgeCollection | undefined || undefined, tags)}
            disabled={!title.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            Save to Knowledge Base
          </button>
        </div>
      </div>
    </div>
  );
}

// ── note modal ────────────────────────────────────────────────────────────────

interface NoteModalProps {
  initial?: { title: string; content: string; tags: string[]; collection?: KnowledgeCollection };
  onSave: (title: string, content: string, tags: string[], collection?: KnowledgeCollection) => void;
  onCancel: () => void;
}

function NoteModal({ initial, onSave, onCancel }: NoteModalProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [collection, setCollection] = useState<KnowledgeCollection | ''>(initial?.collection ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  const addTag = (t: string) => {
    const clean = t.trim().toLowerCase();
    if (clean && !tags.includes(clean)) setTags((prev) => [...prev, clean]);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[640px] max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">{initial ? 'Edit Note' : 'New Note'}</h2>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Collection */}
          <div className="grid grid-cols-4 gap-2">
            {KNOWLEDGE_COLLECTIONS.map((c) => {
              const m = COLLECTION_META[c.id];
              const selected = collection === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCollection(selected ? '' : c.id)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    selected ? `${m.bg} ${m.text} ${m.border} border-2` : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.icon}{m.label}
                </button>
              );
            })}
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden min-h-[200px]">
            <WysiwygEditor initialContent={content} onChange={setContent} onBlur={() => {}} />
          </div>

          {/* Tags */}
          <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                  {tag}
                  <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="hover:text-red-500"><X size={10} /></button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(tagInput);
                  setTagInput('');
                }
              }}
              placeholder="Add tag, press Enter…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="p-6 pt-0 flex justify-end gap-2 border-t border-slate-100">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => onSave(title.trim(), content, tags, collection as KnowledgeCollection | undefined || undefined)}
            disabled={!title.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}

// ── reading mode ──────────────────────────────────────────────────────────────

interface ReadingModeProps {
  item: ProductKnowledgeItem;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ReadingMode({ item, onClose, onEdit, onDelete }: ReadingModeProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);

  const isPdf = item.fileType === 'application/pdf';
  const fileUrl = item.fileData ? `data:${item.fileType};base64,${item.fileData}` : null;

  return (
    <div className="fixed inset-0 z-[150] bg-white flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-base font-semibold text-slate-800">{item.title}</h2>
            {item.collection && <CollectionBadge collection={item.collection} />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {item.type === 'note' && (
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              <Edit3 size={14} /> Edit
            </button>
          )}
          <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isPdf && fileUrl ? (
          <div className="flex flex-col items-center py-8 px-4">
            <Document
              file={fileUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              className="shadow-lg"
            >
              <Page pageNumber={currentPage} width={Math.min(window.innerWidth - 80, 800)} />
            </Document>
            {numPages > 1 && (
              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-slate-600">{currentPage} / {numPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                  disabled={currentPage === numPages}
                  className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        ) : item.type === 'note' ? (
          <div className="max-w-3xl mx-auto py-10 px-8">
            <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: item.content || '' }} />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-10 px-8">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{item.content}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── main view ─────────────────────────────────────────────────────────────────

export const KnowledgeView: React.FC = () => {
  const productKnowledge = useAppStore((s) => s.productKnowledge);
  const addKnowledgeItem = useAppStore((s) => s.addKnowledgeItem);
  const updateKnowledgeItem = useAppStore((s) => s.updateKnowledgeItem);
  const deleteKnowledgeItem = useAppStore((s) => s.deleteKnowledgeItem);

  const [activeCollection, setActiveCollection] = useState<KnowledgeCollection | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Upload flow
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingContent, setPendingContent] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Note flow
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductKnowledgeItem | null>(null);

  // Reading mode
  const [readingItem, setReadingItem] = useState<ProductKnowledgeItem | null>(null);

  // AI ask
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [answer, setAnswer] = useState<KnowledgeAnswer | null>(null);
  const questionRef = useRef<HTMLInputElement>(null);

  // ── filtered items ──
  const filtered = productKnowledge.filter((item) => {
    if (activeCollection !== 'all' && item.collection !== activeCollection) return false;
    if (selectedTags.length > 0 && !selectedTags.every((t) => item.tags?.includes(t))) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.content && item.content.toLowerCase().includes(q)) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }
    return true;
  });

  const allTags = Array.from(new Set(productKnowledge.flatMap((i) => i.tags || []))).sort();

  const countFor = (col: KnowledgeCollection) => productKnowledge.filter((i) => i.collection === col).length;

  // ── drag & drop ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  }, []);

  const processFile = useCallback(async (file: File) => {
    setIsExtracting(true);
    try {
      const text = await extractText(file);
      setPendingContent(text);
      setPendingFile(file);
    } catch {
      setPendingContent('');
      setPendingFile(file);
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) await processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    e.target.value = '';
  }, [processFile]);

  // ── save uploaded doc ──
  const handleUploadSave = async (
    title: string,
    collection: KnowledgeCollection | undefined,
    tags: string[]
  ) => {
    if (!pendingFile) return;
    try {
      const fileData = await fileToBase64(pendingFile);
      const item: ProductKnowledgeItem = {
        id: generateId(),
        title,
        type: 'document',
        content: pendingContent,
        fileData,
        fileName: pendingFile.name,
        fileType: pendingFile.type,
        fileSize: pendingFile.size,
        tags,
        collection,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addKnowledgeItem(item);
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setPendingFile(null);
    setPendingContent('');
  };

  // ── save note ──
  const handleNoteSave = (title: string, content: string, tags: string[], collection?: KnowledgeCollection) => {
    if (editingItem) {
      updateKnowledgeItem(editingItem.id, { title, content, tags, collection });
      setEditingItem(null);
    } else {
      addKnowledgeItem({
        id: generateId(),
        title,
        type: 'note',
        content,
        tags,
        collection,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setShowNoteModal(false);
  };

  // ── delete ──
  const handleDelete = (id: string) => {
    if (confirm('Delete this item?')) {
      deleteKnowledgeItem(id);
      if (readingItem?.id === id) setReadingItem(null);
    }
  };

  // ── AI ask ──
  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;
    setIsAsking(true);
    setAnswer(null);
    try {
      const result = await askKnowledgeBase(question, productKnowledge);
      setAnswer(result);
    } catch (err) {
      setAnswer({ answer: 'Something went wrong. Please try again.', citations: [] });
    } finally {
      setIsAsking(false);
    }
  };

  // ── reading mode editing ──
  const handleReadingEdit = () => {
    if (!readingItem) return;
    setEditingItem(readingItem);
    setShowNoteModal(true);
  };

  if (readingItem) {
    return (
      <ReadingMode
        item={readingItem}
        onClose={() => setReadingItem(null)}
        onEdit={handleReadingEdit}
        onDelete={() => handleDelete(readingItem.id)}
      />
    );
  }

  return (
    <div
      className={`flex h-full relative ${isDragOver ? 'ring-2 ring-inset ring-blue-400' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-50/90 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none">
          <div className="text-center">
            <Upload size={40} className="mx-auto text-blue-500 mb-2" />
            <p className="text-lg font-semibold text-blue-700">Drop to add to Knowledge Base</p>
          </div>
        </div>
      )}

      {/* Extracting overlay */}
      {isExtracting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm font-medium">Extracting document text…</span>
          </div>
        </div>
      )}

      {/* Collections sidebar */}
      <div className="w-52 shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col p-3 gap-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">Collections</p>

        <button
          onClick={() => setActiveCollection('all')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            activeCollection === 'all'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-medium'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="flex items-center gap-2"><Layers size={14} />All</span>
          <span className="text-xs text-slate-400">{productKnowledge.length}</span>
        </button>

        {KNOWLEDGE_COLLECTIONS.map((c) => {
          const m = COLLECTION_META[c.id];
          const count = countFor(c.id);
          const active = activeCollection === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCollection(c.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? `bg-white text-slate-900 shadow-sm border border-slate-200 font-medium`
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className={`flex items-center gap-2 ${active ? m.text : ''}`}>
                {m.icon}{m.label}
              </span>
              <span className="text-xs text-slate-400">{count}</span>
            </button>
          );
        })}

        <div className="mt-auto pt-3 border-t border-slate-200 space-y-1">
          <button
            onClick={() => setShowNoteModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Plus size={14} /> New Note
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Upload size={14} /> Upload File
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Knowledge</h1>

          {/* AI Ask bar */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-400">
              <Sparkles size={16} className="text-violet-500 shrink-0" />
              <input
                ref={questionRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="Ask your knowledge base anything…"
                className="flex-1 text-sm bg-transparent focus:outline-none text-slate-700 placeholder:text-slate-400"
              />
              {answer && (
                <button onClick={() => { setAnswer(null); setQuestion(''); }} className="text-slate-400 hover:text-slate-600 shrink-0">
                  <X size={14} />
                </button>
              )}
              <button
                onClick={handleAsk}
                disabled={!question.trim() || isAsking}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-40 transition-colors"
              >
                {isAsking ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Ask
              </button>
            </div>
          </div>

          {/* AI Answer */}
          {answer && (
            <div className="mt-3 bg-violet-50 border border-violet-200 rounded-xl p-4">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{answer.answer}</p>
              {answer.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-violet-200">
                  <p className="text-xs font-semibold text-violet-600 mb-2">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {answer.citations.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          const item = productKnowledge.find((i) => i.id === c.id);
                          if (item) setReadingItem(item);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-violet-200 text-violet-700 rounded-full text-xs hover:bg-violet-100 transition-colors"
                      >
                        <FileText size={10} />
                        {c.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search + tag filters */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {allTags.slice(0, 12).map((tag) => (
                <button
                  key={tag}
                  onClick={() =>
                    setSelectedTags((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                    )
                  }
                  className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cards grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <BookOpen size={40} className="text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">
                {productKnowledge.length === 0
                  ? 'Your knowledge base is empty'
                  : 'No items match your filters'}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {productKnowledge.length === 0 && 'Drag a document here or create a note to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((item) => (
                <KnowledgeCard
                  key={item.id}
                  item={item}
                  onClick={() => setReadingItem(item)}
                  onDelete={() => handleDelete(item.id)}
                  onEdit={() => {
                    if (item.type === 'note') {
                      setEditingItem(item);
                      setShowNoteModal(true);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {pendingFile && (
        <UploadModal
          file={pendingFile}
          extractedContent={pendingContent}
          onSave={handleUploadSave}
          onCancel={() => { setPendingFile(null); setPendingContent(''); }}
        />
      )}

      {(showNoteModal || editingItem) && (
        <NoteModal
          initial={editingItem ? {
            title: editingItem.title,
            content: editingItem.content || '',
            tags: editingItem.tags || [],
            collection: editingItem.collection,
          } : undefined}
          onSave={handleNoteSave}
          onCancel={() => { setShowNoteModal(false); setEditingItem(null); }}
        />
      )}

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md" />
    </div>
  );
};

// ── card ──────────────────────────────────────────────────────────────────────

function KnowledgeCard({
  item,
  onClick,
  onDelete,
  onEdit,
}: {
  item: ProductKnowledgeItem;
  onClick: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const preview = item.type === 'note'
    ? stripHtml(item.content || '').substring(0, 160)
    : (item.content || '').substring(0, 160);

  return (
    <div
      className="group bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all relative flex flex-col gap-3"
      onClick={onClick}
    >
      {/* Actions */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        {item.type === 'note' && (
          <button onClick={onEdit} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
            <Edit3 size={13} />
          </button>
        )}
        <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Header row */}
      <div className="flex items-start gap-2 pr-12">
        <div className={`mt-0.5 shrink-0 ${item.type === 'document' ? 'text-blue-500' : 'text-emerald-500'}`}>
          {item.type === 'document' ? <FileText size={16} /> : <FileIcon size={16} />}
        </div>
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{item.title}</h3>
      </div>

      {/* Preview */}
      {preview && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{preview}</p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1">
          {item.collection && <CollectionBadge collection={item.collection} />}
          {(item.tags || []).slice(0, 2).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">{tag}</span>
          ))}
          {(item.tags || []).length > 2 && (
            <span className="text-xs text-slate-400">+{item.tags!.length - 2}</span>
          )}
        </div>
        <span className="text-xs text-slate-400 shrink-0">
          {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
        </span>
      </div>

      {item.type === 'document' && item.fileName && (
        <p className="text-xs text-slate-400 truncate -mt-1">{item.fileName} · {item.fileSize ? formatFileSize(item.fileSize) : ''}</p>
      )}
    </div>
  );
}
