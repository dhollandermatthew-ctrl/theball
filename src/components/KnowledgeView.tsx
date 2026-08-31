import React, { useState, useRef, useCallback, useEffect, Component } from 'react';

class KnowledgeErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8 text-red-600 text-sm font-mono whitespace-pre-wrap">
          <strong>Knowledge view error:</strong>{'\n'}
          {(this.state.error as Error).message}{'\n\n'}
          {(this.state.error as Error).stack}
        </div>
      );
    }
    return this.props.children;
  }
}
import {
  Search, Upload, FileText, Plus, Trash2, X, Sparkles,
  ChevronLeft, ChevronRight, BookOpen,
  Layers, Send, Loader2, Edit3, ArrowLeft, Mic, Download,
  Terminal, Zap, Copy, Check, Link2, Share2,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { useAppStore } from '@/domain/state';
import { ProductKnowledgeItem, KnowledgeCommand, UserCollection } from '@/domain/types';
import { generateId } from '@/domain/utils';
import { extractText } from '@/domain/extractText';
import { formatFileSize, readKnowledgeFile, deleteKnowledgeFile, openKnowledgeFile, downloadFile, base64ToBlob } from '@/domain/fileStorage';
import { suggestTags } from '@/domain/ai/suggestTags';
import { askKnowledgeBase, KnowledgeAnswer } from '@/domain/ai/knowledgeAsk';
import { WysiwygEditor } from './WysiwygEditor';
import MDEditor from '@uiw/react-md-editor';
import { sharpenPlaybook } from '@/domain/ai/sharpenPlaybook';

// ── helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || d.innerText || '';
}

// Static color presets for user-defined collections (full tailwind classes for PurgeCSS safety)
const COLOR_PRESETS: Record<string, { border: string; badge: string; swatch: string }> = {
  blue:    { border: 'border-l-blue-400',    badge: 'bg-blue-50 text-blue-700 border-blue-200',         swatch: 'bg-blue-400' },
  emerald: { border: 'border-l-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', swatch: 'bg-emerald-400' },
  violet:  { border: 'border-l-violet-400',  badge: 'bg-violet-50 text-violet-700 border-violet-200',    swatch: 'bg-violet-400' },
  amber:   { border: 'border-l-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200',       swatch: 'bg-amber-400' },
  rose:    { border: 'border-l-rose-400',    badge: 'bg-rose-50 text-rose-700 border-rose-200',          swatch: 'bg-rose-400' },
  indigo:  { border: 'border-l-indigo-400',  badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',    swatch: 'bg-indigo-400' },
  slate:   { border: 'border-l-slate-400',   badge: 'bg-slate-100 text-slate-600 border-slate-300',      swatch: 'bg-slate-400' },
};
const COLOR_NAMES = Object.keys(COLOR_PRESETS);

// ── file type helpers ─────────────────────────────────────────────────────────

function fileTypeInfo(fileType?: string, fileName?: string): { label: string; color: string; bg: string } {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (fileType === 'application/pdf' || ext === 'pdf')
    return { label: 'PDF', color: 'text-red-600', bg: 'bg-red-50' };
  if (fileType?.includes('wordprocessingml') || ext === 'docx' || ext === 'doc')
    return { label: 'Word', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (fileType?.includes('presentationml') || ext === 'pptx' || ext === 'ppt')
    return { label: 'PPT', color: 'text-orange-600', bg: 'bg-orange-50' };
  if (fileType?.includes('spreadsheet') || ext === 'xlsx' || ext === 'xls')
    return { label: 'Excel', color: 'text-green-600', bg: 'bg-green-50' };
  return { label: 'File', color: 'text-slate-600', bg: 'bg-slate-50' };
}

function FileTypeBadge({ fileType, fileName }: { fileType?: string; fileName?: string }) {
  const { label, color, bg } = fileTypeInfo(fileType, fileName);
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${color} ${bg}`}>
      {label}
    </span>
  );
}

function CollectionBadge({ collection, userCollections }: { collection?: string; userCollections: UserCollection[] }) {
  if (!collection) return null;
  const col = userCollections.find((c) => c.id === collection);
  if (!col) return null;
  const preset = COLOR_PRESETS[col.color] || COLOR_PRESETS.slate;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${preset.badge}`}>
      {col.label}
    </span>
  );
}

// ── upload modal ──────────────────────────────────────────────────────────────

interface UploadModalProps {
  file: File;
  onSave: (title: string, collection: string | undefined, tags: string[]) => void;
  onCancel: () => void;
  extractedContent: string;
  userCollections: UserCollection[];
}

function UploadModal({ file, onSave, onCancel, extractedContent, userCollections }: UploadModalProps) {
  const [title, setTitle] = useState(file.name.replace(/\.[^.]+$/, ''));
  const [collection, setCollection] = useState<string>('');
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
          {userCollections.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Collection</label>
              <div className="flex flex-wrap gap-2">
                {userCollections.map((c) => {
                  const preset = COLOR_PRESETS[c.color] || COLOR_PRESETS.slate;
                  const selected = collection === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCollection(selected ? '' : c.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        selected ? `${preset.badge} border-2` : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${preset.swatch}`} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
            onClick={() => onSave(title.trim() || file.name, collection || undefined, tags)}
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
  initial?: { title: string; content: string; tags: string[]; collection?: string };
  onSave: (title: string, content: string, tags: string[], collection?: string) => void;
  onCancel: () => void;
  userCollections: UserCollection[];
  isDocument?: boolean;
}

function NoteModal({ initial, onSave, onCancel, userCollections, isDocument }: NoteModalProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [collection, setCollection] = useState<string>(initial?.collection ?? '');
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
          <h2 className="text-lg font-semibold text-slate-800">{initial ? (isDocument ? 'Edit Document' : 'Edit Note') : 'New Note'}</h2>
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
          {userCollections.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {userCollections.map((c) => {
                const preset = COLOR_PRESETS[c.color] || COLOR_PRESETS.slate;
                const selected = collection === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCollection(selected ? '' : c.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      selected ? `${preset.badge} border-2` : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${preset.swatch}`} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}

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
            onClick={() => onSave(title.trim(), content, tags, collection || undefined)}
            disabled={!title.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isDocument ? 'Save Document' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── document editor modal (full-screen markdown) ─────────────────────────────

interface DocumentEditorModalProps {
  item: ProductKnowledgeItem;
  userCollections: UserCollection[];
  onSave: (updates: Partial<ProductKnowledgeItem>) => void;
  onDelete: () => void;
  onClose: () => void;
}

function DocumentEditorModal({ item, userCollections, onSave, onDelete, onClose }: DocumentEditorModalProps) {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.editableContent || item.content || '');
  const [collection, setCollection] = useState(item.collection ?? '');
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [preview, setPreview] = useState<'edit' | 'live' | 'preview'>('live');
  const [sharpening, setSharpening] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSave = () => {
    onSave({ title, editableContent: content, collection: collection || undefined, tags });
  };

  const handleDownload = async () => {
    await invoke('save_to_downloads', { filename: `${slug}.md`, content });
  };

  const handleSharpen = async () => {
    if (sharpening || !content.trim()) return;
    setSharpening(true);
    try {
      const sharpened = await sharpenPlaybook(title, content);
      setContent(sharpened);
    } catch (e) {
      console.error('Sharpen failed:', e);
    } finally {
      setSharpening(false);
    }
  };


  const addTag = (t: string) => {
    const clean = t.trim().toLowerCase();
    if (clean && !tags.includes(clean)) setTags((prev) => [...prev, clean]);
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#1e1e1e]" data-color-mode="dark">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#252526] border-b border-[#3c3c3c] shrink-0">
        <button
          onClick={() => { handleSave(); onClose(); }}
          className="p-1.5 rounded hover:bg-white/10 text-[#cccccc] transition-colors"
          title="Close"
        >
          <ArrowLeft size={16} />
        </button>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 bg-transparent text-sm font-medium text-[#cccccc] focus:outline-none placeholder:text-[#6e6e6e]"
          placeholder="Document title"
        />

        {/* View toggle */}
        <div className="flex bg-[#3c3c3c] rounded overflow-hidden text-xs font-medium">
          {(['edit', 'live', 'preview'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPreview(mode)}
              className={`px-3 py-1.5 transition-colors capitalize ${
                preview === mode ? 'bg-[#0e639c] text-white' : 'text-[#cccccc] hover:bg-white/10'
              }`}
            >
              {mode === 'live' ? 'Split' : mode === 'preview' ? 'Preview' : 'Edit'}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-[#3c3c3c]" />

        <button
          onClick={handleSharpen}
          disabled={sharpening}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#cccccc] hover:bg-white/10 disabled:opacity-50 transition-colors"
          title="Restructure into a field guide with Quick Reference block"
        >
          {sharpening
            ? <><Loader2 size={13} className="animate-spin" /> Sharpening…</>
            : <><Sparkles size={13} className="text-violet-400" /> Sharpen</>
          }
        </button>

        <div className="w-px h-5 bg-[#3c3c3c]" />

        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#cccccc] hover:bg-white/10 transition-colors"
          title="Download as .md"
        >
          <Download size={13} /> Download
        </button>

        <button
          onClick={() => setConfirmDelete(true)}
          className="p-1.5 rounded hover:bg-red-900/40 text-[#cccccc] hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#0e639c] hover:bg-[#1177bb] text-white transition-colors"
        >
          Save
        </button>
      </div>

      {/* Collection + tags row */}
      <div className="flex items-center gap-2 px-4 py-1.5 bg-[#252526] border-b border-[#3c3c3c] shrink-0 overflow-x-auto">
        <span className="text-xs text-[#6e6e6e] shrink-0">Collection:</span>
        <button
          onClick={() => setCollection('')}
          className={`px-2 py-0.5 rounded text-xs transition-colors ${!collection ? 'bg-[#0e639c] text-white' : 'text-[#9d9d9d] hover:text-[#cccccc]'}`}
        >
          None
        </button>
        {userCollections.map((c) => {
          const preset = COLOR_PRESETS[c.color] || COLOR_PRESETS.slate;
          return (
            <button
              key={c.id}
              onClick={() => setCollection(collection === c.id ? '' : c.id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                collection === c.id ? 'bg-[#0e639c] text-white' : 'text-[#9d9d9d] hover:text-[#cccccc]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${preset.swatch}`} />
              {c.label}
            </button>
          );
        })}
        <div className="w-px h-3.5 bg-[#3c3c3c] mx-1 shrink-0" />
        <span className="text-xs text-[#6e6e6e] shrink-0">Tags:</span>
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#3c3c3c] text-[#9d9d9d] rounded text-xs shrink-0">
            {tag}
            <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="hover:text-red-400"><X size={9} /></button>
          </span>
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); setTagInput(''); }
          }}
          placeholder="+ tag"
          className="bg-transparent text-xs text-[#cccccc] focus:outline-none placeholder:text-[#6e6e6e] w-16 min-w-0"
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden" data-color-mode="dark">
        <MDEditor
          value={content}
          onChange={(val) => setContent(val ?? '')}
          preview={preview}
          height="100%"
          style={{ height: '100%', backgroundColor: '#1e1e1e' }}
          visibleDragbar={false}
          hideToolbar={false}
        />
      </div>

      {/* Slash command hint */}
      <div className="px-4 py-1.5 bg-[#252526] border-t border-[#3c3c3c] shrink-0">
        <p className="text-[10px] text-[#6e6e6e]">
          Slash command: <span className="text-[#9d9d9d] font-mono">/{slug}</span> · Sync to make available in Claude Code
        </p>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60">
          <div className="bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl p-6 w-[320px]">
            <h2 className="text-sm font-semibold text-[#cccccc]">Delete "{title}"?</h2>
            <p className="text-xs text-[#6e6e6e] mt-1">This cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-xs rounded border border-[#3c3c3c] text-[#9d9d9d] hover:bg-white/5">Cancel</button>
              <button onClick={() => { onDelete(); onClose(); }} className="px-4 py-2 text-xs rounded bg-red-700 hover:bg-red-600 text-white font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
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
  const userCollections = useAppStore((s) => s.userCollections);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [fileObjectUrl, setFileObjectUrl] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isPdf = item.fileType === 'application/pdf';
  const isDocument = item.type === 'document';
  const ftInfo = fileTypeInfo(item.fileType, item.fileName);

  // Load file bytes from disk (new items) or legacy base64 (old items)
  useEffect(() => {
    if (!isDocument) return;
    let revoke: string | null = null;

    async function load() {
      let blob: Blob | null = null;
      if (item.filePath) {
        try {
          const bytes = await readKnowledgeFile(item.filePath);
          blob = new Blob([bytes], { type: item.fileType || 'application/octet-stream' });
        } catch (e) {
          console.error('Failed to read knowledge file from disk:', e);
        }
      } else if (item.fileData && item.fileType) {
        blob = base64ToBlob(item.fileData, item.fileType);
      }
      if (blob) {
        revoke = URL.createObjectURL(blob);
        setFileObjectUrl(revoke);
      }
    }
    load();
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [item.id, item.filePath, item.fileData]);

  const handleOpen = () => {
    if (item.filePath) {
      openKnowledgeFile(item.filePath);
    } else if (item.fileData && item.fileName && item.fileType) {
      downloadFile(item.fileData, item.fileName, item.fileType);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-white flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-800">{item.title}</h2>
              {isDocument && <FileTypeBadge fileType={item.fileType} fileName={item.fileName} />}
            </div>
            <div className="flex items-center gap-2">
              {item.collection && <CollectionBadge collection={item.collection} userCollections={userCollections} />}
              {item.fileName && (
                <span className="text-xs text-slate-400">{item.fileName}{item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ''}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDocument && (item.filePath || item.fileData) && (
            <button
              onClick={handleOpen}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
            >
              <Download size={14} /> {item.filePath ? 'Open in app' : 'Download'}
            </button>
          )}
          {item.type === 'note' && (
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              <Edit3 size={14} /> Edit
            </button>
          )}
          <button onClick={() => setConfirmingDelete(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isPdf && fileObjectUrl ? (
          <div className="flex flex-col items-center py-8 px-4">
            <Document
              file={fileObjectUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              className="shadow-lg"
            >
              <Page pageNumber={currentPage} width={Math.min(window.innerWidth - 80, 800)} />
            </Document>
            {numPages > 1 && (
              <div className="flex items-center gap-4 mt-6">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-slate-600">{currentPage} / {numPages}</span>
                <button onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))} disabled={currentPage === numPages} className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
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
          // Non-PDF document: show file card + extracted text
          <div className="max-w-3xl mx-auto py-8 px-8">
            {(item.filePath || item.fileData) && (
              <div className={`flex items-center gap-4 p-4 rounded-xl border mb-8 ${ftInfo.bg} border-opacity-50`}>
                <div className={`p-3 rounded-lg bg-white shadow-sm ${ftInfo.color}`}>
                  <FileText size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{item.fileName}</p>
                  <p className="text-sm text-slate-500">{ftInfo.label} document{item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ''}</p>
                  {item.filePath && <p className="text-xs text-slate-400 mt-0.5 truncate">{item.filePath}</p>}
                </div>
                <button
                  onClick={handleOpen}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm shrink-0"
                >
                  <Download size={14} /> {item.filePath ? 'Open in app' : 'Download original'}
                </button>
              </div>
            )}
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Extracted text</div>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{item.content}</div>
          </div>
        )}
      </div>

      {confirmingDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[320px]">
            <h2 className="text-base font-semibold text-slate-800">Delete this item?</h2>
            <p className="text-sm text-slate-500 mt-1">{item.title}</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmingDelete(false)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={onDelete} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── main view ─────────────────────────────────────────────────────────────────

export const KnowledgeView: React.FC = () => (
  <KnowledgeErrorBoundary><KnowledgeViewInner /></KnowledgeErrorBoundary>
);

const KnowledgeViewInner: React.FC = () => {
  const productKnowledge = useAppStore((s) => s.productKnowledge);
  const addKnowledgeItem = useAppStore((s) => s.addKnowledgeItem);
  const updateKnowledgeItem = useAppStore((s) => s.updateKnowledgeItem);
  const deleteKnowledgeItem = useAppStore((s) => s.deleteKnowledgeItem);

  const knowledgeCommands = useAppStore((s) => s.knowledgeCommands);
  const addKnowledgeCommand = useAppStore((s) => s.addKnowledgeCommand);
  const updateKnowledgeCommand = useAppStore((s) => s.updateKnowledgeCommand);
  const deleteKnowledgeCommand = useAppStore((s) => s.deleteKnowledgeCommand);

  const userCollections = useAppStore((s) => s.userCollections);
  const addUserCollection = useAppStore((s) => s.addUserCollection);
  const deleteUserCollection = useAppStore((s) => s.deleteUserCollection);

  const [activeTab, setActiveTab] = useState<'documents' | 'commands'>('commands');
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [editingCommand, setEditingCommand] = useState<KnowledgeCommand | null>(null);
  const [runningCommand, setRunningCommand] = useState<KnowledgeCommand | null>(null);
  const [pendingDeleteCommandId, setPendingDeleteCommandId] = useState<string | null>(null);

  const [activeCollection, setActiveCollection] = useState<string | 'all'>('all');

  // New collection inline creation
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState('blue');
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

  // Document editor (full-screen markdown)
  const [editingDocument, setEditingDocument] = useState<ProductKnowledgeItem | null>(null);

  // Reading mode (legacy — only used for notes that haven't switched yet)
  const [readingItem, setReadingItem] = useState<ProductKnowledgeItem | null>(null);

  // AI ask
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [answer, setAnswer] = useState<KnowledgeAnswer | null>(null);
  const questionRef = useRef<HTMLInputElement>(null);

  // Mic / speech-to-text
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleMic = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setQuestion((prev) => (prev ? prev + ' ' + transcript : transcript));
      questionRef.current?.focus();
    };
    recognitionRef.current = rec;
    rec.start();
  }, [isListening]);

  // Delete confirmation (no confirm() — Tauri blocks it)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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

  const countFor = (col: string) => productKnowledge.filter((i) => i.collection === col).length;

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

  // ── save uploaded doc — extract text only, no binary storage ──
  const handleUploadSave = (title: string, collection: string | undefined, tags: string[]) => {
    if (!pendingFile) return;
    const item: ProductKnowledgeItem = {
      id: generateId(),
      title,
      type: 'document',
      content: pendingContent,
      fileName: pendingFile.name,
      fileType: pendingFile.type,
      fileSize: pendingFile.size,
      tags,
      collection,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addKnowledgeItem(item);
    setPendingFile(null);
    setPendingContent('');
  };

  // ── save note/document ──
  const handleNoteSave = (title: string, content: string, tags: string[], collection?: string) => {
    if (editingItem) {
      const updates = editingItem.type === 'document'
        ? { title, editableContent: content, tags, collection }
        : { title, content, tags, collection };
      updateKnowledgeItem(editingItem.id, updates);
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
  const handleDelete = (id: string) => setPendingDeleteId(id);
  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const item = productKnowledge.find((i) => i.id === pendingDeleteId);
    if (item?.filePath) {
      deleteKnowledgeFile(item.filePath).catch(() => {});
    }
    deleteKnowledgeItem(pendingDeleteId);
    if (readingItem?.id === pendingDeleteId) setReadingItem(null);
    setPendingDeleteId(null);
  };

  const confirmDeleteCommand = () => {
    if (!pendingDeleteCommandId) return;
    deleteKnowledgeCommand(pendingDeleteCommandId);
    setPendingDeleteCommandId(null);
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

      {/* Collections sidebar — kept mounted to avoid layout shift; collapses on commands tab */}
      <div className={`shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden transition-[width,padding] duration-200 ${activeTab === 'documents' ? 'w-52 p-3 gap-1' : 'w-0 p-0 border-r-0'}`}>
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

        {userCollections.map((c) => {
          const preset = COLOR_PRESETS[c.color] || COLOR_PRESETS.slate;
          const count = countFor(c.id);
          const active = activeCollection === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCollection(c.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${preset.swatch}`} />
                {c.label}
              </span>
              <span className="text-xs text-slate-400">{count}</span>
            </button>
          );
        })}

        {/* Inline new-collection form */}
        {showNewCollection ? (
          <div className="mt-1 p-2 bg-white border border-slate-200 rounded-lg space-y-2">
            <input
              autoFocus
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="Collection name"
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newColName.trim()) {
                  addUserCollection({ id: generateId(), label: newColName.trim(), color: newColColor });
                  setNewColName('');
                  setNewColColor('blue');
                  setShowNewCollection(false);
                } else if (e.key === 'Escape') {
                  setShowNewCollection(false);
                }
              }}
            />
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setNewColColor(name)}
                  className={`w-4 h-4 rounded-full ${COLOR_PRESETS[name].swatch} ${newColColor === name ? 'ring-2 ring-offset-1 ring-slate-500' : ''}`}
                />
              ))}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  if (newColName.trim()) {
                    addUserCollection({ id: generateId(), label: newColName.trim(), color: newColColor });
                    setNewColName('');
                    setNewColColor('blue');
                    setShowNewCollection(false);
                  }
                }}
                className="flex-1 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
              <button
                onClick={() => setShowNewCollection(false)}
                className="px-2 py-1 text-xs border border-slate-200 text-slate-500 rounded hover:bg-slate-50"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewCollection(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Plus size={12} /> New collection
          </button>
        )}

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
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-800">Playbooks</h1>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'documents' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Documents{productKnowledge.length > 0 ? ` (${productKnowledge.length})` : ''}
              </button>
              <button
                onClick={() => setActiveTab('commands')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'commands' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Commands{knowledgeCommands.length > 0 ? ` (${knowledgeCommands.length})` : ''}
              </button>
            </div>
          </div>

          {/* Documents-only: AI Ask bar + search */}
          {activeTab === 'documents' && <>
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
                  onClick={handleMic}
                  title={isListening ? 'Stop listening' : 'Speak your question'}
                  className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                    isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Mic size={15} />
                </button>
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
                            if (!item) return;
                            if (item.type === 'document') setEditingDocument(item);
                            else { setEditingItem(item); setShowNoteModal(true); }
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
          </>}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'commands' ? (
            <CommandsPanel
              commands={knowledgeCommands}
              documents={productKnowledge}
              onNew={() => { setEditingCommand(null); setShowCommandModal(true); }}
              onEdit={(cmd) => { setEditingCommand(cmd); setShowCommandModal(true); }}
              onRun={(cmd) => setRunningCommand(cmd)}
              onDelete={(id) => setPendingDeleteCommandId(id)}
              onDuplicate={(cmd) => {
                const now = new Date().toISOString();
                addKnowledgeCommand({
                  id: generateId(),
                  name: cmd.name + ' (copy)',
                  description: cmd.description,
                  prompt: cmd.prompt,
                  linkedDocumentIds: [...cmd.linkedDocumentIds],
                  createdAt: now,
                  updatedAt: now,
                });
              }}
            />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <BookOpen size={40} className="text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">
                {productKnowledge.length === 0 ? 'Your knowledge base is empty' : 'No items match your filters'}
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
                  userCollections={userCollections}
                  onClick={() => {
                    if (item.type === 'document') {
                      setEditingDocument(item);
                    } else {
                      setEditingItem(item);
                      setShowNoteModal(true);
                    }
                  }}
                  onDelete={() => handleDelete(item.id)}
                  onEdit={() => {
                    if (item.type === 'document') {
                      setEditingDocument(item);
                    } else {
                      setEditingItem(item);
                      setShowNoteModal(true);
                    }
                  }}
                  onCollectionChange={(col) => updateKnowledgeItem(item.id, { collection: col })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document editor (full-screen markdown) */}
      {editingDocument && (
        <DocumentEditorModal
          item={editingDocument}
          userCollections={userCollections}
          onSave={(updates) => updateKnowledgeItem(editingDocument.id, updates)}
          onDelete={() => {
            deleteKnowledgeItem(editingDocument.id);
            setEditingDocument(null);
          }}
          onClose={() => setEditingDocument(null)}
        />
      )}

      {/* Modals */}
      {pendingFile && (
        <UploadModal
          file={pendingFile}
          extractedContent={pendingContent}
          userCollections={userCollections}
          onSave={handleUploadSave}
          onCancel={() => { setPendingFile(null); setPendingContent(''); }}
        />
      )}

      {(showNoteModal || editingItem) && (
        <NoteModal
          initial={editingItem ? {
            title: editingItem.title,
            content: editingItem.editableContent || editingItem.content || '',
            tags: editingItem.tags || [],
            collection: editingItem.collection,
          } : undefined}
          isDocument={editingItem?.type === 'document'}
          userCollections={userCollections}
          onSave={handleNoteSave}
          onCancel={() => { setShowNoteModal(false); setEditingItem(null); }}
        />
      )}

      {pendingDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[320px]">
            <h2 className="text-base font-semibold text-slate-800">Delete this item?</h2>
            <p className="text-sm text-slate-500 mt-1">
              {productKnowledge.find(i => i.id === pendingDeleteId)?.title}
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPendingDeleteId(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteCommandId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[320px]">
            <h2 className="text-base font-semibold text-slate-800">Delete this command?</h2>
            <p className="text-sm text-slate-500 mt-1">
              {knowledgeCommands.find(c => c.id === pendingDeleteCommandId)?.name}
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPendingDeleteCommandId(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={confirmDeleteCommand} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showCommandModal && (
        <CommandModal
          initial={editingCommand}
          documents={productKnowledge}
          onSave={(data) => {
            const now = new Date().toISOString();
            if (editingCommand) {
              updateKnowledgeCommand(editingCommand.id, { ...data, updatedAt: now });
            } else {
              addKnowledgeCommand({ id: generateId(), ...data, createdAt: now, updatedAt: now });
            }
            const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const content = data.description ? `${data.description}\n\n${data.prompt}` : data.prompt;
            invoke('write_claude_command', { filename: `${slug}.md`, content }).catch(() => {});
            setShowCommandModal(false);
            setEditingCommand(null);
          }}
          onCancel={() => { setShowCommandModal(false); setEditingCommand(null); }}
        />
      )}

      {runningCommand && (
        <RunCommandModal
          command={runningCommand}
          documents={productKnowledge}
          onClose={() => setRunningCommand(null)}
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
  onCollectionChange,
  userCollections,
}: {
  item: ProductKnowledgeItem;
  onClick: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onCollectionChange: (col: string | undefined) => void;
  userCollections: UserCollection[];
}) {
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCollectionPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowCollectionPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCollectionPicker]);

  const preview = item.type === 'note'
    ? stripHtml(item.content || '').substring(0, 200)
    : (item.content || '').substring(0, 200);

  const colEntry = item.collection ? userCollections.find((c) => c.id === item.collection) : undefined;
  const accentColor = colEntry
    ? (COLOR_PRESETS[colEntry.color] || COLOR_PRESETS.slate).border
    : 'border-l-slate-200';

  return (
    <div
      className={`group bg-white border border-slate-200 border-l-4 ${accentColor} rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-slate-300 hover:border-l-4 transition-all relative flex flex-col gap-2.5`}
      onClick={onClick}
    >
      {/* Actions */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        {item.type === 'document' && (item.filePath || item.fileData) && (
          <button
            onClick={() => item.filePath
              ? openKnowledgeFile(item.filePath)
              : downloadFile(item.fileData!, item.fileName!, item.fileType!)
            }
            title={item.filePath ? 'Open in native app' : 'Download original file'}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <Download size={13} />
          </button>
        )}
        {item.type === 'note' && (
          <button onClick={onEdit} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
            <Edit3 size={13} />
          </button>
        )}
        <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Title row with file type badge */}
      <div className="flex items-start gap-2 pr-16">
        {item.type === 'document' && <FileTypeBadge fileType={item.fileType} fileName={item.fileName} />}
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{item.title}</h3>
      </div>

      {/* Preview */}
      {preview && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{preview}</p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1 items-center relative" onClick={(e) => e.stopPropagation()}>
          {/* Collection badge — click to change */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowCollectionPicker((v) => !v)}
              className="transition-opacity"
              title="Change collection"
            >
              {item.collection
                ? <CollectionBadge collection={item.collection} userCollections={userCollections} />
                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-500">
                    + collection
                  </span>
              }
            </button>

            {showCollectionPicker && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 min-w-[160px]">
                {userCollections.length === 0 && (
                  <p className="px-3 py-2 text-xs text-slate-400">No collections yet</p>
                )}
                {userCollections.map((c) => {
                  const preset = COLOR_PRESETS[c.color] || COLOR_PRESETS.slate;
                  const active = item.collection === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        onCollectionChange(active ? undefined : c.id);
                        setShowCollectionPicker(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        active ? preset.badge : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${preset.swatch}`} />
                      {c.label}
                      {active && <span className="ml-auto">✓</span>}
                    </button>
                  );
                })}
                {item.collection && (
                  <button
                    onClick={() => { onCollectionChange(undefined); setShowCollectionPicker(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-50 mt-1 border-t border-slate-100 pt-2"
                  >
                    <X size={11} /> Remove
                  </button>
                )}
              </div>
            )}
          </div>

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
        <p className="text-xs text-slate-400 truncate">{item.fileName}{item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ''}</p>
      )}
    </div>
  );
}

// ── CommandsPanel ─────────────────────────────────────────────────────────────

function extractVariables(prompt: string): string[] {
  const matches = prompt.match(/\{\{([^}]+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(2, -2).trim()))];
}

function CommandsPanel({
  commands,
  documents,
  onNew,
  onEdit,
  onRun,
  onDelete,
  onDuplicate,
}: {
  commands: KnowledgeCommand[];
  documents: ProductKnowledgeItem[];
  onNew: () => void;
  onEdit: (cmd: KnowledgeCommand) => void;
  onRun: (cmd: KnowledgeCommand) => void;
  onDelete: (id: string) => void;
  onDuplicate: (cmd: KnowledgeCommand) => void;
}) {
  const [search, setSearch] = useState('');
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());

  async function syncToClaudeCommand(cmd: KnowledgeCommand) {
    const slug = cmd.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const content = cmd.description ? `${cmd.description}\n\n${cmd.prompt}` : cmd.prompt;
    try {
      await invoke('write_claude_command', { filename: `${slug}.md`, content });
      setSyncedIds((prev) => new Set(prev).add(cmd.id));
      setTimeout(() => setSyncedIds((prev) => { const n = new Set(prev); n.delete(cmd.id); return n; }), 2000);
    } catch (e) {
      console.error('Failed to sync command to Claude:', e);
    }
  }
  const filtered = commands.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands…"
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors shrink-0"
        >
          <Plus size={14} />
          New Command
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Terminal size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">{commands.length === 0 ? 'No commands yet' : 'No commands match your search'}</p>
          {commands.length === 0 ? (
            <>
              <p className="text-slate-400 text-sm mt-1 mb-5">Commands are reusable AI prompts with variables and linked documents</p>
              <button
                onClick={onNew}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                <Plus size={14} /> Create your first command
              </button>
            </>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((cmd) => {
            const vars = extractVariables(cmd.prompt);
            const linkedDocs = documents.filter((d) => cmd.linkedDocumentIds.includes(d.id));
            return (
              <div key={cmd.id} className="group bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all flex gap-4">
                <div className="shrink-0 w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                  <Terminal size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800">{cmd.name}</h3>
                      {cmd.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{cmd.description}</p>
                      )}
                      <p className="text-[11px] text-slate-400 font-mono line-clamp-2 mt-1.5 leading-relaxed">{cmd.prompt}</p>
                    </div>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => syncToClaudeCommand(cmd)}
                        title="Sync to Claude Code as slash command"
                        className={`p-1.5 rounded-lg transition-colors ${syncedIds.has(cmd.id) ? 'text-emerald-600 bg-emerald-50' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                      >
                        {syncedIds.has(cmd.id) ? <Check size={13} /> : <Share2 size={13} />}
                      </button>
                      <button onClick={() => onDuplicate(cmd)} title="Duplicate" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                        <Copy size={13} />
                      </button>
                      <button onClick={() => onEdit(cmd)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => onDelete(cmd.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {vars.length > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs">
                          <Zap size={10} />
                          {vars.length} variable{vars.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {linkedDocs.length > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs">
                          <Link2 size={10} />
                          {linkedDocs.length} doc{linkedDocs.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onRun(cmd)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors shrink-0"
                    >
                      <Zap size={11} />
                      Use
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CommandModal ──────────────────────────────────────────────────────────────

function CommandModal({
  initial,
  documents,
  onSave,
  onCancel,
}: {
  initial: KnowledgeCommand | null;
  documents: ProductKnowledgeItem[];
  onSave: (data: { name: string; description: string; prompt: string; linkedDocumentIds: string[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [prompt, setPrompt] = useState(initial?.prompt ?? '');
  const [linkedDocumentIds, setLinkedDocumentIds] = useState<string[]>(initial?.linkedDocumentIds ?? []);

  const detectedVars = extractVariables(prompt);

  const toggleDoc = (id: string) =>
    setLinkedDocumentIds((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">{initial ? 'Edit Command' : 'New Command'}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summarise for stakeholders"
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Description <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this command do?"
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Prompt</label>
            <p className="text-xs text-slate-400 mt-0.5 mb-1.5">Use <code className="bg-slate-100 px-1 rounded">{'{{variable_name}}'}</code> for fill-in values</p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Write your prompt here… e.g. Summarise the following for {{audience}}: {{content}}"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono min-h-[160px]"
            />
            {detectedVars.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {detectedVars.map((v) => (
                  <span key={v} className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs">
                    <Zap size={10} />{v}
                  </span>
                ))}
              </div>
            )}
          </div>

          {documents.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Linked Documents <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
              <p className="text-xs text-slate-400 mt-0.5 mb-2">These documents will be included as context when the command runs</p>
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-2">
                {documents.map((doc) => (
                  <label key={doc.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkedDocumentIds.includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700 truncate">{doc.title}</span>
                    {doc.type === 'document' && doc.fileName && (
                      <span className="text-xs text-slate-400 shrink-0 ml-auto">{doc.fileName.split('.').pop()?.toUpperCase()}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => { if (name.trim() && prompt.trim()) onSave({ name: name.trim(), description: description.trim(), prompt: prompt.trim(), linkedDocumentIds }); }}
            disabled={!name.trim() || !prompt.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            {initial ? 'Save Changes' : 'Create Command'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RunCommandModal ───────────────────────────────────────────────────────────

function RunCommandModal({
  command,
  documents,
  onClose,
}: {
  command: KnowledgeCommand;
  documents: ProductKnowledgeItem[];
  onClose: () => void;
}) {
  const vars = extractVariables(command.prompt);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(vars.map((v) => [v, '']))
  );
  const [copied, setCopied] = useState(false);

  const filled = command.prompt.replace(/\{\{([^}]+)\}\}/g, (_, key) => values[key.trim()] || `{{${key.trim()}}}`);

  const linkedDocs = documents.filter((d) => command.linkedDocumentIds.includes(d.id));
  const fullPrompt = linkedDocs.length > 0
    ? `${filled}\n\n=== Context ===\n\n${linkedDocs.map((d) => `=== ${d.title} ===\n${d.content || ''}`).join('\n\n')}`
    : filled;

  const approxTokens = Math.round(fullPrompt.length / 4);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Cmd+Enter / Ctrl+Enter to copy
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCopy();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [fullPrompt]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Terminal size={16} className="text-slate-500 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-800">{command.name}</h2>
              {command.description && <p className="text-xs text-slate-400 mt-0.5">{command.description}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {vars.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Fill in variables</p>
              {vars.map((v) => (
                <div key={v}>
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Zap size={12} className="text-amber-500" />{v}
                  </label>
                  <input
                    type="text"
                    value={values[v] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [v]: e.target.value }))}
                    placeholder={`Enter ${v}…`}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}

          {linkedDocs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <p className="w-full text-xs font-semibold text-slate-600 uppercase tracking-wider">Context documents</p>
              {linkedDocs.map((d) => (
                <span key={d.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs">
                  <FileText size={10} />{d.title}
                </span>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              {vars.length > 0 ? 'Filled prompt' : 'Prompt'}
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-60 overflow-y-auto">
              {fullPrompt}
            </div>
            <p className={`text-xs mt-1.5 text-right ${approxTokens > 4000 ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
              ~{approxTokens.toLocaleString()} tokens
              {approxTokens > 4000 && ' — may exceed some AI context limits'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
          <p className="text-xs text-slate-400">⌘ Enter to copy</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              Close
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-700 transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy prompt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
