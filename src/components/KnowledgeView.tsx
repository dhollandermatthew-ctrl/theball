import React, { useState, useRef, useCallback, useEffect, Component } from 'react';
import { createPortal } from 'react-dom';

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
  ChevronLeft, ChevronRight, ChevronDown, BookOpen,
  Layers, Send, Loader2, Edit3, ArrowLeft, Mic, Download,
  Terminal, Zap, Copy, Check, Link2, Share2, Pin, PinOff, ClipboardCopy,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { useAppStore } from '@/domain/state';
import { ProductKnowledgeItem, KnowledgeCommand, UserCollection, SavedArtifact } from '@/domain/types';
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

function getCardPreview(item: ProductKnowledgeItem): string {
  // Prefer editableContent (Markdown field guides) — strip markdown syntax
  const md = item.editableContent || '';
  if (md) {
    const lines = md.split('\n')
      .map((l) =>
        l.replace(/^#{1,6}\s+/, '')       // strip headings
         .replace(/\*\*([^*]+)\*\*/g, '$1') // un-bold
         .replace(/[*_`~>|\\]/g, '')       // strip other md
         .replace(/\[([^\]]+)\]\([^)]+\)/, '$1') // un-link
         .trim()
      )
      .filter((l) => l.length > 25 && !l.toLowerCase().startsWith('use for:'));
    return lines.slice(0, 3).join(' ').substring(0, 200);
  }
  if (item.type === 'note') {
    return stripHtml(item.content || '').replace(/\s+/g, ' ').trim().substring(0, 200);
  }
  return (item.content || '').replace(/\s+/g, ' ').trim().substring(0, 200);
}

function getUseForLine(item: ProductKnowledgeItem): string | null {
  const md = item.editableContent || '';
  if (!md) return null;
  for (const line of md.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('use for:')) {
      return trimmed.substring('use for:'.length).trim();
    }
  }
  return null;
}

type DocBadgeConfig = { label: string; color: string; bg: string; border: string };

function getDocTypeBadge(item: ProductKnowledgeItem): DocBadgeConfig | null {
  const tags = item.tags || [];
  if (tags.includes('learning-log') || item.title.startsWith('Learning Log —') || item.collection === 'Learning Log') {
    return { label: 'Learning Log', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
  }
  if (tags.includes('ai-context')) {
    return { label: 'AI Context', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' };
  }
  if (tags.includes('raw-notes') || item.title.toLowerCase().includes('raw notes')) {
    return { label: 'Raw Notes', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300' };
  }
  if (item.type === 'document' && item.editableContent && !item.fileName) {
    return { label: 'Field Guide', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  }
  if (item.type === 'note') {
    return { label: 'Note', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
  }
  return null;
}

function formatCardDate(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
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
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-100">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <button
          onClick={() => { handleSave(); onClose(); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors text-xs font-medium shrink-0"
          title="Back"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="w-px h-5 bg-slate-200 shrink-0" />

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 bg-transparent text-base font-semibold text-slate-800 focus:outline-none placeholder:text-slate-300"
          placeholder="Untitled document"
        />

        {/* View toggle */}
        <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-medium shrink-0">
          {(['edit', 'live', 'preview'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPreview(mode)}
              className={`px-3 py-1 rounded-md transition-all ${
                preview === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {mode === 'live' ? 'Split' : mode === 'preview' ? 'Read' : 'Edit'}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200 shrink-0" />

        <button
          onClick={handleSharpen}
          disabled={sharpening}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 disabled:opacity-50 transition-colors shrink-0"
          title="AI-restructure into a sharp field guide"
        >
          {sharpening
            ? <><Loader2 size={12} className="animate-spin" /> Sharpening…</>
            : <><Sparkles size={12} /> Sharpen</>
          }
        </button>

        <button
          onClick={handleDownload}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          title="Download as .md"
        >
          <Download size={15} />
        </button>

        <button
          onClick={() => setConfirmDelete(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
          title="Delete"
        >
          <Trash2 size={15} />
        </button>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0 shadow-sm"
        >
          Save
        </button>
      </div>

      {/* Metadata bar */}
      <div className="flex items-center gap-3 px-5 py-1.5 bg-white border-b border-slate-100 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">Collection</span>
          <button
            onClick={() => setCollection('')}
            className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${!collection ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
          >
            None
          </button>
          {userCollections.map((c) => {
            const preset = COLOR_PRESETS[c.color] || COLOR_PRESETS.slate;
            return (
              <button
                key={c.id}
                onClick={() => setCollection(collection === c.id ? '' : c.id)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                  collection === c.id ? `${preset.badge} border` : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${preset.swatch}`} />
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="w-px h-3.5 bg-slate-200 mx-0.5 shrink-0" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 shrink-0">Tags</span>
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[11px] shrink-0">
              {tag}
              <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="hover:text-red-500 ml-0.5"><X size={8} /></button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); setTagInput(''); }
            }}
            placeholder="+ add tag"
            className="bg-transparent text-[11px] text-slate-500 focus:outline-none placeholder:text-slate-300 w-20 min-w-0"
          />
        </div>
      </div>

      {/* Editor — paper feel on slate canvas */}
      <div className="flex-1 overflow-hidden flex flex-col" data-color-mode="light">
        <div className="flex-1 overflow-hidden">
          <MDEditor
            value={content}
            onChange={(val) => setContent(val ?? '')}
            preview={preview}
            height="100%"
            style={{ height: '100%', background: '#f1f5f9' }}
            visibleDragbar={false}
            hideToolbar={false}
          />
        </div>
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-between px-5 py-1.5 bg-white border-t border-slate-100 shrink-0">
        <p className="text-[10px] text-slate-400">
          /{slug}
        </p>
        <p className="text-[10px] text-slate-400">Markdown · syncs to Claude Code on save</p>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl p-6 w-[320px]">
            <h2 className="text-sm font-semibold text-slate-800">Delete "{title}"?</h2>
            <p className="text-xs text-slate-500 mt-1">This cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { onDelete(); onClose(); }} className="px-4 py-2 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium">Delete</button>
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

  const savedArtifacts = useAppStore((s) => s.savedArtifacts);
  const addSavedArtifact = useAppStore((s) => s.addSavedArtifact);
  const updateSavedArtifact = useAppStore((s) => s.updateSavedArtifact);
  const deleteSavedArtifact = useAppStore((s) => s.deleteSavedArtifact);

  const [activeTab, setActiveTab] = useState<'documents' | 'commands' | 'created'>('commands');
  const [showAddArtifactModal, setShowAddArtifactModal] = useState(false);
  const [editingArtifact, setEditingArtifact] = useState<SavedArtifact | null>(null);
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
            <h1 className="text-2xl font-bold text-slate-800">AI Arsenal</h1>
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
              <button
                onClick={() => setActiveTab('created')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'created' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Artifacts{savedArtifacts.length > 0 ? ` (${savedArtifacts.length})` : ''}
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
          {activeTab === 'created' ? (
            <ArtifactsPanel
              artifacts={savedArtifacts}
              onAdd={() => { setEditingArtifact(null); setShowAddArtifactModal(true); }}
              onEdit={(a) => { setEditingArtifact(a); setShowAddArtifactModal(true); }}
              onDelete={(id) => deleteSavedArtifact(id)}
            />
          ) : activeTab === 'commands' ? (
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
          onUpdateLinkedDocs={(ids) => updateKnowledgeCommand(runningCommand.id, { linkedDocumentIds: ids })}
        />
      )}

      {showAddArtifactModal && (
        <ArtifactModal
          initial={editingArtifact}
          onSave={(data) => {
            if (editingArtifact) {
              updateSavedArtifact(editingArtifact.id, data);
            } else {
              addSavedArtifact({ id: generateId(), ...data, createdAt: new Date().toISOString() });
            }
            setShowAddArtifactModal(false);
            setEditingArtifact(null);
          }}
          onCancel={() => { setShowAddArtifactModal(false); setEditingArtifact(null); }}
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
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});
  const colBtnRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const openPicker = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!colBtnRef.current) return;
    const rect = colBtnRef.current.getBoundingClientRect();
    setPickerStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, zIndex: 9999 });
    setShowCollectionPicker((v) => !v);
  }, []);

  useEffect(() => {
    if (!showCollectionPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
          colBtnRef.current && !colBtnRef.current.contains(e.target as Node)) {
        setShowCollectionPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCollectionPicker]);

  const preview = getCardPreview(item);
  const useFor = getUseForLine(item);
  const docBadge = getDocTypeBadge(item);

  const colEntry = item.collection ? userCollections.find((c) => c.id === item.collection) : undefined;
  const accentColor = colEntry
    ? (COLOR_PRESETS[colEntry.color] || COLOR_PRESETS.slate).border
    : 'border-l-slate-200';

  const hasFile = item.type === 'document' && (item.filePath || item.fileData);

  return (
    <div
      className={`group bg-white border border-slate-200 border-l-4 ${accentColor} rounded-xl cursor-pointer hover:shadow-md hover:border-slate-300 transition-all relative flex flex-col overflow-hidden`}
      onClick={onClick}
    >
      {/* Hover actions */}
      <div className="absolute top-3 right-3 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
        {hasFile && (
          <button
            onClick={() => item.filePath
              ? openKnowledgeFile(item.filePath)
              : downloadFile(item.fileData!, item.fileName!, item.fileType!)
            }
            title={item.filePath ? 'Open in native app' : 'Download original file'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <Download size={13} />
          </button>
        )}
        <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Main content */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        {/* Badge row */}
        <div className="flex items-center gap-1.5 flex-wrap pr-10">
          {docBadge && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${docBadge.color} ${docBadge.bg} ${docBadge.border}`}>
              {docBadge.label}
            </span>
          )}
          {item.type === 'document' && item.fileName && (
            <FileTypeBadge fileType={item.fileType} fileName={item.fileName} />
          )}
          <button ref={colBtnRef} onClick={openPicker} title={item.collection ? 'Change collection' : 'Add to collection'} className="shrink-0">
            {item.collection
              ? <CollectionBadge collection={item.collection} userCollections={userCollections} />
              : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border border-dashed border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-colors">+ collection</span>
            }
          </button>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{item.title}</h3>

        {/* Use for chips / preview text */}
        {useFor ? (
          <div className="flex flex-wrap gap-1.5 flex-1">
            {splitUseForChips(useFor).map((chip) => (
              <span key={chip} className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-[11px] font-medium whitespace-nowrap leading-none">
                {chip}
              </span>
            ))}
          </div>
        ) : preview ? (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 flex-1">{preview}</p>
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {/* Footer strip */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-slate-50 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap gap-1 items-center min-w-0">
          {(item.tags || []).filter(t => t !== 'ai-context' && t !== 'raw-notes').slice(0, 2).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-500 rounded-full text-[10px]">{tag}</span>
          ))}
          {(item.tags || []).filter(t => t !== 'ai-context' && t !== 'raw-notes').length > 2 && (
            <span className="text-[10px] text-slate-400">+{(item.tags!).filter(t => t !== 'ai-context' && t !== 'raw-notes').length - 2}</span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 shrink-0">{formatCardDate(item.createdAt)}</span>
      </div>

      {/* Collection picker — rendered via portal so it escapes overflow:auto parents */}
      {showCollectionPicker && createPortal(
        <div
          ref={pickerRef}
          style={pickerStyle}
          className="bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 min-w-[180px]"
        >
          {userCollections.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">No collections yet — create one in the sidebar</p>
          ) : (
            userCollections.map((c) => {
              const preset = COLOR_PRESETS[c.color] || COLOR_PRESETS.slate;
              const active = item.collection === c.id;
              return (
                <button
                  key={c.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCollectionChange(active ? undefined : c.id);
                    setShowCollectionPicker(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active ? preset.badge : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${preset.swatch}`} />
                  {c.label}
                  {active && <span className="ml-auto text-slate-400">✓</span>}
                </button>
              );
            })
          )}
          {item.collection && (
            <button
              onClick={(e) => { e.stopPropagation(); onCollectionChange(undefined); setShowCollectionPicker(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-50 mt-1 border-t border-slate-100 pt-2"
            >
              <X size={11} /> Remove from collection
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── CommandsPanel ─────────────────────────────────────────────────────────────

function extractVariables(prompt: string): string[] {
  const matches = prompt.match(/\{\{([^}]+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(2, -2).trim()))];
}

function humanizeVarName(v: string): string {
  const words = v.replace(/[_-]/g, ' ').split(' ').filter(Boolean);
  const titled = words.map(w => w.charAt(0).toUpperCase() + w.slice(1));
  if (titled.length > 3) return titled.slice(0, 3).join(' ') + '…';
  return titled.join(' ');
}

function shortDocTitle(title: string): string {
  const stripped = title.replace(/\s*—\s*(AI Context Document|Field Guide|Notes|Raw Notes|Context|Document)$/i, '').trim();
  const words = stripped.split(' ');
  return words.length > 4 ? words.slice(0, 4).join(' ') + '…' : stripped;
}

function stripMd(text: string): string {
  return text.replace(/\*\*/g, '').replace(/[_*`]/g, '').trim();
}

function splitUseForChips(text: string): string[] {
  const base = text.split('—')[0].trim();
  const parts = base.split(/,\s*|\s+or\s+/).map(s => s.replace(/\.$/, '').trim());
  return parts
    .filter(s => s.length > 2)
    .slice(0, 5)
    .map(s => {
      if (s.length <= 30) return s;
      const cut = s.substring(0, 30);
      const lastSpace = cut.lastIndexOf(' ');
      return (lastSpace > 12 ? cut.substring(0, lastSpace) : cut) + '…';
    });
}

function extractUseCases(prompt: string, description: string): string[] {
  const match = prompt.match(/##\s*when to use(?:\s+this\s+command)?\s*\n+([\s\S]*?)(?:\n##|\n#|$)/i);
  if (match) {
    const rawLines = match[1]
      .split('\n')
      .map(l => stripMd(l.replace(/^[-*•\d.]+\s*/, '').trim()))
      .filter(l => l.length > 5);
    // Expand comma/or run-ons into individual items
    const expanded: string[] = [];
    for (const line of rawLines) {
      if (expanded.length >= 3) break;
      if (line.includes(',') || /\bor\b/.test(line)) {
        const parts = line.split(/,\s*|\s+or\s+/)
          .map(p => p.replace(/\.$/, '').trim())
          .filter(p => p.length > 4);
        expanded.push(...parts);
      } else {
        expanded.push(line);
      }
    }
    const result = expanded.slice(0, 3);
    if (result.length > 0) return result;
  }
  if (description) {
    const chips = splitUseForChips(stripMd(description));
    if (chips.length > 0) return chips.slice(0, 3);
  }
  return [];
}

function extractWhenToUse(prompt: string, description: string): string | null {
  const match = prompt.match(/##\s*when to use(?:\s+this\s+command)?\s*\n+([\s\S]*?)(?:\n##|\n#|$)/i);
  if (match) {
    const text = match[1]
      .split('\n')
      .map(l => l.replace(/^[-*•]\s*/, '').trim())
      .filter(l => l.length > 10)[0];
    if (text) return stripMd(text);
  }
  return description ? stripMd(description) : null;
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCmdId, setSelectedCmdId] = useState<string | null>(null);

  async function copyPrompt(cmd: KnowledgeCommand) {
    await navigator.clipboard.writeText(cmd.prompt);
    setCopiedId(cmd.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

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

  const filtered = commands.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Auto-select first command on mount and when filter changes
  React.useEffect(() => {
    if (filtered.length > 0) {
      setSelectedCmdId((prev) => {
        if (prev && filtered.find((c) => c.id === prev)) return prev;
        return filtered[0].id;
      });
    } else {
      setSelectedCmdId(null);
    }
  }, [filtered.length, search]);

  const selectedCmd = filtered.find((c) => c.id === selectedCmdId) ?? filtered[0] ?? null;
  const selectedLinkedDocs = selectedCmd ? documents.filter((d) => selectedCmd.linkedDocumentIds.includes(d.id)) : [];

  // Render prompt text with {{variables}} highlighted
  function renderPromptHighlighted(prompt: string) {
    const parts = prompt.split(/(\{\{[^}]+\}\})/g);
    return parts.map((part, i) => {
      if (/^\{\{[^}]+\}\}$/.test(part)) {
        const label = part.slice(2, -2).trim();
        return (
          <span key={i} className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded text-[11px] font-semibold leading-none mx-0.5">
            <Zap size={8} />{label}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header: search + new button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands…"
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shrink-0"
        >
          <Plus size={14} />
          New Command
        </button>
      </div>

      {/* Content — master-detail */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Terminal size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">{commands.length === 0 ? 'No commands yet' : 'No commands match'}</p>
          {commands.length === 0 && (
            <>
              <p className="text-slate-400 text-sm mt-1 mb-5">Commands are reusable AI prompts with variables and linked documents</p>
              <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                <Plus size={14} /> Create your first command
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0" style={{ minHeight: 480 }}>
          {/* Left: compact command list */}
          <div className="flex flex-col w-64 shrink-0 overflow-y-auto pr-1">
            {(() => {
              const slashCmds = filtered.filter((c) => c.commandType === 'slash' || (!c.commandType && c.linkedDocumentIds.length > 0));
              const learningCmds = filtered.filter((c) => c.commandType === 'learning');
              const exampleCmds = filtered.filter((c) => c.commandType === 'example');
              const pureCmds = filtered.filter((c) => !c.commandType && c.linkedDocumentIds.length === 0);

              const renderCard = (cmd: typeof filtered[0]) => {
                const isSelected = selectedCmdId === cmd.id;
                const useCases = extractUseCases(cmd.prompt, cmd.description);
                const vars = extractVariables(cmd.prompt);
                const linkedDocs = documents.filter((d) => cmd.linkedDocumentIds.includes(d.id));
                return (
                  <div
                    key={cmd.id}
                    onClick={() => setSelectedCmdId(cmd.id)}
                    className={`cursor-pointer rounded-lg p-2.5 transition-all ${
                      isSelected
                        ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
                        : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`shrink-0 mt-0.5 w-5 h-5 rounded-md flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Terminal size={11} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold leading-tight ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>{cmd.name}</p>
                        {useCases.length > 0 ? (
                          <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{useCases[0]}</p>
                        ) : cmd.description ? (
                          <p className="text-[10.5px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">{cmd.description}</p>
                        ) : null}
                        {(vars.length > 0 || linkedDocs.length > 0) && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {vars.slice(0, 2).map((v) => (
                              <span key={v} className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[9px] font-medium">
                                <Zap size={7} />{humanizeVarName(v)}
                              </span>
                            ))}
                            {linkedDocs.length > 0 && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[9px] font-medium">
                                <Link2 size={7} />{linkedDocs.length} doc{linkedDocs.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              };

              const sections: Array<{ label: string; color: string; items: typeof filtered }> = [
                { label: 'Slash Commands', color: 'text-indigo-500', items: slashCmds },
                { label: 'For Learning', color: 'text-emerald-600', items: learningCmds },
                { label: 'Examples', color: 'text-amber-600', items: exampleCmds },
                { label: 'Prompts', color: 'text-violet-500', items: pureCmds },
              ].filter((s) => s.items.length > 0);

              return (
                <>
                  {sections.map((section, i) => (
                    <div key={section.label} className={i > 0 ? 'mt-5' : ''}>
                      <div className="flex items-center gap-2 px-1 mb-2">
                        <span className={`text-[10px] font-bold tracking-widest uppercase ${section.color}`}>{section.label}</span>
                        <span className="text-[10px] text-slate-400 font-medium tabular-nums">{section.items.length}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">{section.items.map(renderCard)}</div>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>

          {/* Right: detail panel */}
          {selectedCmd ? (
            <div className="flex-1 min-w-0 border border-slate-200 rounded-xl bg-white flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{selectedCmd.name}</h3>
                    {selectedCmd.description && (
                      <p className="text-sm text-slate-500 mt-1 leading-relaxed">{selectedCmd.description}</p>
                    )}
                    {extractVariables(selectedCmd.prompt).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {extractVariables(selectedCmd.prompt).map((v) => (
                          <span key={v} className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[11px] font-medium">
                            <Zap size={9} />{humanizeVarName(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onRun(selectedCmd)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shrink-0"
                  >
                    <Zap size={13} />
                    Use
                  </button>
                </div>

                {/* When to use — ranked */}
                {(() => {
                  const useCases = extractUseCases(selectedCmd.prompt, selectedCmd.description);
                  if (useCases.length === 0) return null;
                  return (
                    <div>
                      <p className="text-[10.5px] font-bold tracking-widest uppercase text-slate-400 mb-2">When to use</p>
                      <div className="flex flex-col gap-2">
                        {useCases.map((u, i) => (
                          <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-200 transition-colors">
                            <div className="shrink-0 w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-bold flex items-center justify-center tabular-nums">
                              {i + 1}
                            </div>
                            <p className="text-sm text-slate-700 font-medium leading-snug">{u}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Prompt preview */}
                <div>
                  <p className="text-[10.5px] font-bold tracking-widest uppercase text-slate-400 mb-2">Prompt preview</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 leading-relaxed font-mono whitespace-pre-wrap max-h-44 overflow-y-auto">
                    {renderPromptHighlighted(selectedCmd.prompt)}
                  </div>
                </div>

                {/* Linked docs */}
                {selectedLinkedDocs.length > 0 && (
                  <div>
                    <p className="text-[10.5px] font-bold tracking-widest uppercase text-slate-400 mb-2">Linked documents</p>
                    <div className="flex flex-col gap-2">
                      {selectedLinkedDocs.map((doc) => (
                        <div key={doc.id} className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <FileText size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-emerald-800">{doc.title}</p>
                            {(doc.editableContent || doc.content) && (
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-3">
                                {(doc.editableContent || doc.content || '').slice(0, 300)}
                                {(doc.editableContent || doc.content || '').length > 300 ? '…' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between gap-3 shrink-0">
                <p className="text-[11px] text-slate-400">
                  <span className="font-mono text-slate-500">/{selectedCmd.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); onDuplicate(selectedCmd); }} title="Duplicate" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                    <Copy size={13} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onEdit(selectedCmd); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                    <Edit3 size={13} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(selectedCmd.id); }} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button
                    onClick={() => copyPrompt(selectedCmd)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      copiedId === selectedCmd.id
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    {copiedId === selectedCmd.id ? <Check size={11} /> : <ClipboardCopy size={11} />}
                    Copy
                  </button>
                  <button
                    onClick={() => syncToClaudeCommand(selectedCmd)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      syncedIds.has(selectedCmd.id)
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    {syncedIds.has(selectedCmd.id) ? <Check size={11} /> : <Share2 size={11} />}
                    {syncedIds.has(selectedCmd.id) ? 'Synced' : '→ Claude'}
                  </button>
                  <button
                    onClick={() => onRun(selectedCmd)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    <Zap size={11} />
                    Use
                  </button>
                </div>
              </div>
            </div>
          ) : null}
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
  onSave: (data: { name: string; description: string; prompt: string; linkedDocumentIds: string[]; commandType: import('@/domain/types').KnowledgeCommandType }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [prompt, setPrompt] = useState(initial?.prompt ?? '');
  const [linkedDocumentIds, setLinkedDocumentIds] = useState<string[]>(initial?.linkedDocumentIds ?? []);
  const [commandType, setCommandType] = useState<import('@/domain/types').KnowledgeCommandType>(initial?.commandType ?? 'slash');

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
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 block">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'slash', label: 'Slash Command', desc: 'Runs with linked docs', color: 'indigo' },
                { value: 'learning', label: 'For Learning', desc: 'Prompts to understand topics', color: 'emerald' },
                { value: 'example', label: 'Example', desc: 'Reference prompts to browse', color: 'amber' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCommandType(opt.value)}
                  className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all ${
                    commandType === opt.value
                      ? opt.color === 'indigo' ? 'border-indigo-400 bg-indigo-50 text-indigo-900'
                        : opt.color === 'emerald' ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                        : 'border-amber-400 bg-amber-50 text-amber-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <span className="text-[10px] mt-0.5 opacity-70 leading-snug">{opt.desc}</span>
                </button>
              ))}
            </div>
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
            onClick={() => { if (name.trim() && prompt.trim()) onSave({ name: name.trim(), description: description.trim(), prompt: prompt.trim(), linkedDocumentIds, commandType }); }}
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
  onUpdateLinkedDocs,
}: {
  command: KnowledgeCommand;
  documents: ProductKnowledgeItem[];
  onClose: () => void;
  onUpdateLinkedDocs: (ids: string[]) => void;
}) {
  const pinnedKnowledgeIds = useAppStore((s) => s.pinnedKnowledgeIds);

  const vars = extractVariables(command.prompt);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(vars.map((v) => [v, '']))
  );
  const [copied, setCopied] = useState(false);
  const [docSearch, setDocSearch] = useState('');
  const [promptOpen, setPromptOpen] = useState(false);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Tier 1: permanently attached to this command
  const attachedSet = new Set(command.linkedDocumentIds);
  const attachedDocs = documents.filter((d) => attachedSet.has(d.id));

  // Tier 2: Core (pinned) docs not already in Tier 1 — pre-checked, toggleable
  const coreOnlyIds = pinnedKnowledgeIds.filter((id) => !attachedSet.has(id));
  const [coreChecked, setCoreChecked] = useState<Set<string>>(() => new Set(coreOnlyIds));

  // Tier 3: everything else — unchecked by default, toggleable per session
  const [sessionChecked, setSessionChecked] = useState<Set<string>>(new Set());

  const toggleCore = (id: string) => {
    setCoreChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSession = (id: string) => {
    setSessionChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filled = command.prompt.replace(/\{\{([^}]+)\}\}/g, (_, key) => values[key.trim()] || `{{${key.trim()}}}`);

  const includedDocs = [
    ...attachedDocs,
    ...documents.filter((d) => coreOnlyIds.includes(d.id) && coreChecked.has(d.id)),
    ...documents.filter((d) => !attachedSet.has(d.id) && !coreOnlyIds.includes(d.id) && sessionChecked.has(d.id)),
  ];

  const fullPrompt = includedDocs.length > 0
    ? `${filled}\n\n=== Context ===\n\n${includedDocs.map((d) => `=== ${d.title} ===\n${d.editableContent || d.content || ''}`).join('\n\n')}`
    : filled;

  const approxTokens = Math.round(fullPrompt.length / 4);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const q = docSearch.toLowerCase();
  // Tier 2 docs filtered (always show checked ones even during search)
  const coreDocs = documents.filter((d) => coreOnlyIds.includes(d.id) && (!q || coreChecked.has(d.id) || d.title.toLowerCase().includes(q)));
  // Tier 3 docs filtered (always show checked ones even during search)
  const sessionDocs = documents.filter((d) => !attachedSet.has(d.id) && !coreOnlyIds.includes(d.id) && (!q || sessionChecked.has(d.id) || d.title.toLowerCase().includes(q)));

  const totalIncluded = attachedDocs.length + [...coreChecked].filter(id => coreOnlyIds.includes(id)).length + sessionChecked.size;

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

  const renderCoreRow = (d: ProductKnowledgeItem) => {
    const checked = coreChecked.has(d.id);
    return (
      <button key={d.id} onClick={() => toggleCore(d.id)} className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-amber-50/60 ${checked ? 'bg-amber-50/40' : ''}`}>
        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`}>
          {checked && <Check size={10} className="text-white" />}
        </div>
        <FileText size={12} className={checked ? 'text-amber-600' : 'text-slate-400'} />
        <span className={`text-xs truncate ${checked ? 'text-amber-700 font-medium' : 'text-slate-500'}`}>{d.title}</span>
      </button>
    );
  };

  const renderSessionRow = (d: ProductKnowledgeItem) => {
    const checked = sessionChecked.has(d.id);
    return (
      <button key={d.id} onClick={() => toggleSession(d.id)} className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50 ${checked ? 'bg-blue-50/40' : ''}`}>
        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
          {checked && <Check size={10} className="text-white" />}
        </div>
        <FileText size={12} className={checked ? 'text-blue-500' : 'text-slate-400'} />
        <span className={`text-xs truncate ${checked ? 'text-blue-700 font-medium' : 'text-slate-500'}`}>{d.title}</span>
      </button>
    );
  };

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

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {vars.length > 0 && (
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Input</p>
              {vars.map((v, i) => (
                <div key={v}>
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Zap size={12} className="text-amber-500" />{humanizeVarName(v)}
                  </label>
                  <textarea
                    ref={(el) => { textareaRefs.current[v] = el; }}
                    value={values[v] ?? ''}
                    autoFocus={i === 0}
                    onChange={(e) => {
                      setValues((prev) => ({ ...prev, [v]: e.target.value }));
                      // auto-resize
                      const el = e.target;
                      el.style.height = 'auto';
                      el.style.height = `${Math.max(el.scrollHeight, 80)}px`;
                    }}
                    onKeyDown={(e) => {
                      // Cmd+Enter copies from anywhere in the form
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleCopy();
                      }
                    }}
                    placeholder={`Enter ${humanizeVarName(v)}…`}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono leading-relaxed overflow-hidden"
                    style={{ minHeight: '80px' }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Context documents</p>
              {totalIncluded > 0 && (
                <span className="text-xs text-blue-600 font-medium">{totalIncluded} included</span>
              )}
            </div>

            {/* Tier 1: Attached — always included */}
            {attachedDocs.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-900 flex items-center gap-1.5">
                  <Link2 size={10} className="text-slate-300" />
                  <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Attached</span>
                  <span className="ml-auto text-[10px] text-slate-400">always included</span>
                </div>
                {attachedDocs.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-t border-slate-100">
                    <div className="w-4 h-4 rounded bg-slate-700 flex items-center justify-center shrink-0">
                      <Check size={10} className="text-white" />
                    </div>
                    <FileText size={12} className="text-slate-500" />
                    <span className="text-xs text-slate-700 font-medium truncate">{d.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tier 2: Core (pinned) — pre-checked, optional */}
            {coreOnlyIds.length > 0 && (
              <div className="rounded-xl border border-amber-200 overflow-hidden">
                <div className="px-3 py-1.5 bg-amber-50 flex items-center gap-1.5">
                  <Pin size={10} className="text-amber-500" />
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Core</span>
                  <span className="ml-auto text-[10px] text-amber-500/70">pinned — on by default</span>
                </div>
                {coreDocs.map(renderCoreRow)}
                {coreDocs.length === 0 && q && (
                  <p className="text-xs text-slate-400 px-3 py-2">No core docs match</p>
                )}
              </div>
            )}

            {/* Tier 3: Session — search to add */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-50 flex items-center gap-1.5">
                <FileText size={10} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Add for this session</span>
              </div>
              <div className="px-3 py-2 border-t border-slate-100">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Search documents…"
                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                {sessionDocs.map(renderSessionRow)}
                {sessionDocs.length === 0 && q && (
                  <p className="text-xs text-slate-400 px-3 py-2">No docs match "{docSearch}"</p>
                )}
                {sessionDocs.length === 0 && !q && documents.length === 0 && (
                  <p className="text-xs text-slate-400 px-3 py-2">No documents yet — add some in the Documents tab</p>
                )}
                {sessionDocs.length === 0 && !q && documents.length > 0 && (
                  <p className="text-xs text-slate-400 px-3 py-2">All documents are already attached or pinned to Core</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setPromptOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assembled prompt</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${approxTokens > 4000 ? 'text-amber-600' : 'text-slate-400'}`}>
                  ~{approxTokens.toLocaleString()} tokens{approxTokens > 4000 ? ' ⚠' : ''}
                </span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${promptOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {promptOpen && (
              <div className="bg-white border-t border-slate-200 p-4 text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                {fullPrompt}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors shrink-0">
            Cancel
          </button>
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl font-semibold transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-white hover:bg-slate-700 active:scale-[0.98]'
            }`}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied to clipboard!' : 'Copy prompt'}
          </button>
          <span className="text-xs text-slate-400 shrink-0 hidden sm:block">⌘↵</span>
        </div>
      </div>
    </div>
  );
}

// ── ArtifactsPanel ────────────────────────────────────────────────────────────

function ArtifactsPanel({
  artifacts,
  onAdd,
  onEdit,
  onDelete,
}: {
  artifacts: SavedArtifact[];
  onAdd: () => void;
  onEdit: (a: SavedArtifact) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async (artifact: SavedArtifact) => {
    setDownloadingId(artifact.id);
    setDownloadError(null);
    try {
      let html = artifact.htmlContent;
      if (!html) {
        const res = await fetch(artifact.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        html = await res.text();
      }
      const slug = artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const filename = `${slug}.html`;
      const path = await invoke<string>('save_to_downloads', { filename, content: html });
      await invoke('reveal_in_finder', { path });
    } catch (e: any) {
      setDownloadError(`Could not download "${artifact.title}". The artifact may be private or require sign-in.`);
      setTimeout(() => setDownloadError(null), 5000);
    } finally {
      setDownloadingId(null);
    }
  };

  const sorted = [...artifacts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm text-slate-500">
            HTML artifacts generated by Claude — save links to revisit and share them.
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm shrink-0"
        >
          <Plus size={13} />
          Save artifact
        </button>
      </div>

      {/* Grid */}
      {sorted.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Link2 size={22} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">No saved artifacts yet</p>
          <p className="text-slate-400 text-sm max-w-xs">
            Paste a claude.ai artifact URL to save it here for quick access.
          </p>
          <button
            onClick={onAdd}
            className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            <Plus size={14} />
            Save your first artifact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((artifact) => (
            <div
              key={artifact.id}
              className="group bg-white border border-slate-200 border-l-4 border-l-indigo-400 rounded-xl hover:shadow-md hover:border-slate-300 transition-all flex flex-col overflow-hidden"
            >
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 flex-1">
                    {artifact.title}
                  </h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => onEdit(artifact)}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(artifact.id)}
                      className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {artifact.description && (
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{artifact.description}</p>
                )}
                {artifact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {artifact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-md text-[11px] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 truncate max-w-[140px]">{artifact.url}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleDownload(artifact)}
                    disabled={downloadingId === artifact.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                    title={artifact.htmlContent ? "Download saved HTML to your computer" : "Download HTML to your computer (requires network)"}
                  >
                    {downloadingId === artifact.id ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Download size={10} />
                    )}
                    {artifact.htmlContent ? 'Download' : 'Download'}
                  </button>
                  <a
                    href={artifact.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-100 transition-colors"
                  >
                    <Share2 size={10} />
                    Open
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Download error toast */}
      {downloadError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-red-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg max-w-sm text-center">
          {downloadError}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[320px]">
            <h2 className="text-base font-semibold text-slate-800">Remove this artifact?</h2>
            <p className="text-sm text-slate-500 mt-1">
              {artifacts.find((a) => a.id === confirmDeleteId)?.title}
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ArtifactModal ─────────────────────────────────────────────────────────────

function ArtifactModal({
  initial,
  onSave,
  onCancel,
}: {
  initial: SavedArtifact | null;
  onSave: (data: Omit<SavedArtifact, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(initial?.url ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [tagInput, setTagInput] = useState(initial?.tags.join(', ') ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!url.trim() || !title.trim()) return;
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    setIsSaving(true);
    let htmlContent: string | undefined;
    if (!initial) {
      try {
        const res = await fetch(url.trim());
        if (res.ok) htmlContent = await res.text();
      } catch {
        // Silently skip — URL stays accessible via Open
      }
    }
    onSave({ url: url.trim(), title: title.trim(), description: description.trim(), tags, htmlContent });
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[480px] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            {initial ? 'Edit artifact' : 'Save artifact'}
          </h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
              Artifact URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://claude.ai/artifact/…"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What does this artifact do?"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this artifact is for…"
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
              Tags <span className="text-slate-400 font-normal normal-case">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. dashboard, sales, prototype"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!url.trim() || !title.trim() || isSaving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:opacity-40 transition-colors"
          >
            {isSaving && <Loader2 size={13} className="animate-spin" />}
            {isSaving ? 'Saving…' : initial ? 'Save changes' : 'Save artifact'}
          </button>
        </div>
      </div>
    </div>
  );
}
