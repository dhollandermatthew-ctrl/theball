// FILE: src/components/ProductKnowledgeView.tsx
import React, { useState, useRef } from 'react';
import { Search, Upload, FileText, Plus, Tag, Download, Trash2, X, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { suggestTags } from '@/domain/ai/suggestTags';

// Configure PDF.js worker for Tauri production builds
// Use CDN for now (works in both dev and prod)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import { useAppStore } from '@/domain/state';
import { ProductKnowledgeItem } from '@/domain/types';
import { generateId } from '@/domain/utils';
import { extractText } from '@/domain/extractText';
import { fileToBase64, downloadFile, formatFileSize } from '@/domain/fileStorage';
import { WysiwygEditor } from './WysiwygEditor';

export const ProductKnowledgeView: React.FC = () => {
  const productKnowledge = useAppStore((s) => s.productKnowledge);
  const addKnowledgeItem = useAppStore((s) => s.addKnowledgeItem);
  const updateKnowledgeItem = useAppStore((s) => s.updateKnowledgeItem);
  const deleteKnowledgeItem = useAppStore((s) => s.deleteKnowledgeItem);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to strip HTML tags for preview
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Filter items by search and tags
  const filteredItems = productKnowledge.filter((item: ProductKnowledgeItem) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchLower) ||
      (item.content && item.content.toLowerCase().includes(searchLower)) ||
      (item.tags && item.tags.some((tag: string) => tag.toLowerCase().includes(searchLower)));

    const matchesTags =
      selectedTags.length === 0 ||
      (item.tags && selectedTags.every((tag) => item.tags!.includes(tag)));

    return matchesSearch && matchesTags;
  });

  // Get all unique tags
  const allTags: string[] = Array.from(
    new Set(productKnowledge.flatMap((item: ProductKnowledgeItem) => item.tags || []))
  ).sort();

  // Handle document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // Extract text (if supported)
      const extractedText = await extractText(file);

      // Convert file to Base64
      const fileData = await fileToBase64(file);

      // Create item
      const item: ProductKnowledgeItem = {
        id: generateId(),
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        type: 'document',
        content: extractedText || undefined,
        fileData,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addKnowledgeItem(item);
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const selectedItem = productKnowledge.find((i: ProductKnowledgeItem) => i.id === selectedItemId);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Product Knowledge</h1>
        
        {/* Search Bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by title, content, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={() => setShowAddNoteModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Quick Note
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Upload size={20} />
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>

        {/* Tag Cloud */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() =>
                  setSelectedTags((prev) =>
                    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                  )
                }
                className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                <Tag size={14} />
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700 hover:bg-red-200"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredItems.length === 0 ? (
          <div className="text-center text-slate-500 mt-12">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">
              {productKnowledge.length === 0
                ? 'No knowledge items yet. Create a note or upload a document to get started.'
                : 'No items match your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item: ProductKnowledgeItem) => (
              <div
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText
                      size={20}
                      className={item.type === 'document' ? 'text-blue-600' : 'text-green-600'}
                    />
                    <h3 className="font-semibold text-slate-900 line-clamp-1">{item.title}</h3>
                  </div>
                </div>

                {item.content && (
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                    {stripHtml(item.content)}
                  </p>
                )}

                {item.type === 'document' && item.fileName && (
                  <p className="text-xs text-slate-500 mb-2">
                    {item.fileName} • {item.fileSize ? formatFileSize(item.fileSize) : ''}
                  </p>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.tags.slice(0, 3).map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">
                        +{item.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.pptx,image/*"
        onChange={handleDocumentUpload}
        style={{ display: 'none' }}
      />

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <AddNoteModal
          onClose={() => setShowAddNoteModal(false)}
          onSave={(title, content, tags) => {
            const item: ProductKnowledgeItem = {
              id: generateId(),
              title,
              type: 'note',
              content,
              tags,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            addKnowledgeItem(item);
            setShowAddNoteModal(false);
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <KnowledgeDetailModal
          item={selectedItem}
          onClose={() => setSelectedItemId(null)}
          onUpdate={(updates) => updateKnowledgeItem(selectedItem.id, updates)}
          onDelete={() => {
            console.log('[ProductKnowledgeView] Delete clicked for:', selectedItem.id, selectedItem.title);
            deleteKnowledgeItem(selectedItem.id);
            console.log('[ProductKnowledgeView] After deleteKnowledgeItem called');
            setSelectedItemId(null);
            console.log('[ProductKnowledgeView] Modal closed');
          }}
          onDownload={
            selectedItem.type === 'document' && selectedItem.fileData
              ? () =>
                  downloadFile(
                    selectedItem.fileData!,
                    selectedItem.fileName!,
                    selectedItem.fileType!
                  )
              : undefined
          }
        />
      )}
    </div>
  );
};

// Add Note Modal Component
interface AddNoteModalProps {
  onClose: () => void;
  onSave: (title: string, content: string, tags: string[]) => void;
}

const AddNoteModal: React.FC<AddNoteModalProps> = ({ onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSave(title, content, tags);
  };

  const handleGenerateTags = async () => {
    if (!title.trim() && !content.trim()) {
      alert('Please enter a title or content first');
      return;
    }

    setIsGeneratingTags(true);
    try {
      const suggested = await suggestTags(title, content);
      
      // Append to existing tags
      const existing = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      
      const combined = Array.from(new Set([...existing, ...suggested]));
      setTagsInput(combined.join(', '));
    } catch (err) {
      console.error('Tag generation failed:', err);
      alert('Failed to generate tags. Please try again.');
    } finally {
      setIsGeneratingTags(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Create Quick Note</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
            <WysiwygEditor
              initialContent={content}
              onChange={setContent}
              onBlur={() => {}}
              placeholder="Write your note here..."
              className="border border-slate-300 rounded-lg min-h-[200px]"
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Tags (comma-separated)
              </label>
              <button
                onClick={handleGenerateTags}
                disabled={isGeneratingTags}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={14} />
                {isGeneratingTags ? 'Generating...' : 'Generate Tags'}
              </button>
            </div>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., AI tools, frameworks, competitor analysis"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
};

// Detail Modal Component
interface KnowledgeDetailModalProps {
  item: ProductKnowledgeItem;
  onClose: () => void;
  onUpdate: (updates: Partial<ProductKnowledgeItem>) => void;
  onDelete: () => void;
  onDownload?: () => void;
}

const KnowledgeDetailModal: React.FC<KnowledgeDetailModalProps> = ({
  item,
  onClose,
  onUpdate,
  onDelete,
  onDownload,
}) => {
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editContent, setEditContent] = useState(item.content || '');
  const [tagsInput, setTagsInput] = useState((item.tags || []).join(', '));
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [showFullContent, setShowFullContent] = useState(false);

  const handleTitleBlur = () => {
    if (editTitle.trim() && editTitle !== item.title) {
      onUpdate({ title: editTitle.trim(), updatedAt: new Date().toISOString() });
    } else if (!editTitle.trim()) {
      setEditTitle(item.title); // Revert if empty
    }
  };

  const handleTagsBlur = () => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    
    const currentTags = item.tags || [];
    const hasChanged = tags.length !== currentTags.length || 
                       tags.some((t, i) => t !== currentTags[i]);
    
    if (hasChanged) {
      onUpdate({ tags, updatedAt: new Date().toISOString() });
    }
  };

  const handleGenerateTags = async () => {
    if (!item.title && !item.content) {
      alert('No content available to generate tags');
      return;
    }

    setIsGeneratingTags(true);
    try {
      const suggested = await suggestTags(item.title, item.content || '');
      
      // Append to existing tags
      const existing = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      
      const combined = Array.from(new Set([...existing, ...suggested]));
      setTagsInput(combined.join(', '));
      
      // Save immediately
      onUpdate({ tags: combined, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.error('Tag generation failed:', err);
      alert('Failed to generate tags. Please try again.');
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleSaveBodyEdit = () => {
    onUpdate({ 
      content: editContent,
      updatedAt: new Date().toISOString()
    });
    setIsEditingBody(false);
  };

  const handleCancelBodyEdit = () => {
    setEditContent(item.content || '');
    setIsEditingBody(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <FileText
              size={24}
              className={item.type === 'document' ? 'text-blue-600' : 'text-green-600'}
            />
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="flex-1 text-xl font-bold text-slate-900 px-2 py-1 border-0 bg-transparent focus:outline-none focus:ring-0 hover:bg-slate-50 rounded"
              placeholder="Title"
              autoComplete="off"
            />
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Metadata */}
          <div className="mb-4 text-sm text-slate-600">
            <p>Type: {item.type === 'document' ? 'Document' : 'Note'}</p>
            {item.fileName && <p>File: {item.fileName}</p>}
            {item.fileSize && <p>Size: {formatFileSize(item.fileSize)}</p>}
            <p>Created: {new Date(item.createdAt).toLocaleString()}</p>
            <p>Updated: {new Date(item.updatedAt).toLocaleString()}</p>
          </div>

          {/* Tags */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
            <div className="space-y-2">
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onBlur={handleTagsBlur}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Comma-separated tags"
              />
              {item.type === 'note' && (
                <button
                  onClick={handleGenerateTags}
                  disabled={isGeneratingTags}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles size={14} />
                  {isGeneratingTags ? 'Generating...' : 'Generate Tags with AI'}
                </button>
              )}
              {/* Visual tag display */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newTags = item.tags!.filter(t => t !== tag);
                          setTagsInput(newTags.join(', '));
                          onUpdate({ tags: newTags, updatedAt: new Date().toISOString() });
                        }}
                        className="ml-1 hover:text-blue-900 transition-colors"
                        aria-label={`Remove ${tag}`}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preview Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                {item.type === 'document' ? 'Preview' : 'Content'}
              </label>
              {item.type === 'note' && !isEditingBody && (
                <button
                  onClick={() => setIsEditingBody(true)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Edit
                </button>
              )}
            </div>
            
            {/* Image Preview */}
            {item.type === 'document' && item.fileType?.startsWith('image/') && item.fileData && (
              <div className="border border-slate-200 rounded-lg p-4 bg-white">
                <img 
                  src={`data:${item.fileType};base64,${item.fileData}`}
                  alt={item.title}
                  className="max-w-full h-auto rounded"
                  style={{ maxHeight: '600px', objectFit: 'contain' }}
                />
              </div>
            )}

            {/* PDF Preview */}
            {item.type === 'document' && item.fileType === 'application/pdf' && item.fileData && (
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <Document
                  file={`data:application/pdf;base64,${item.fileData}`}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  className="flex justify-center"
                >
                  <Page 
                    pageNumber={pageNumber} 
                    width={700}
                    className="shadow-lg"
                  />
                </Document>
                {numPages && numPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                      onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                      disabled={pageNumber <= 1}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>
                    <span className="text-sm text-slate-600">
                      Page {pageNumber} of {numPages}
                    </span>
                    <button
                      onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                      disabled={pageNumber >= numPages}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Text Content (for notes or extracted text from documents) */}
            {item.type === 'note' && isEditingBody ? (
              <div className="border border-slate-300 rounded-lg p-3">
                <WysiwygEditor
                  initialContent={editContent}
                  onChange={(html) => setEditContent(html)}
                  onBlur={() => {}}
                  placeholder="Note content..."
                  className="min-h-[300px]"
                />
              </div>
            ) : item.content ? (
              <div>
                {item.content.length > 5000 && !showFullContent ? (
                  <div>
                    <div 
                      className="p-4 bg-slate-50 rounded-lg text-sm text-slate-700 max-h-96 overflow-y-auto prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: item.content.substring(0, 5000) + '...' }}
                    />
                    <button
                      onClick={() => setShowFullContent(true)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Show full content ({item.content.length.toLocaleString()} characters)
                    </button>
                  </div>
                ) : (
                  <div 
                    className="p-4 bg-slate-50 rounded-lg text-sm text-slate-700 max-h-[600px] overflow-y-auto prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                )}
              </div>
            ) : null}

            {/* No content message for images without extracted text */}
            {!item.content && item.type === 'document' && !item.fileType?.startsWith('image/') && item.fileType !== 'application/pdf' && (
              <p className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-lg">
                No extracted text available for this file type.
              </p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-between">
          {isEditingBody ? (
            <div className="flex gap-3 w-full justify-end">
              <button
                onClick={handleCancelBodyEdit}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBodyEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={(e) => {
                  console.log('[KnowledgeDetailModal] Delete button clicked');
                  e.stopPropagation();
                  console.log('[KnowledgeDetailModal] Calling onDelete immediately');
                  onDelete();
                }}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>

              <div className="flex gap-3">
                {onDownload && (
                  <button
                    onClick={onDownload}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Download size={16} />
                    Download
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
