# Step 3: Plan - Implementation Design

## Feature: Product Knowledge Repository

> **Context Note:** Always reference [ProjectContext.md](../../ProjectContext.md) for complete system architecture and product philosophy.

---

## Overview

**Goal:** Build searchable repository for PM knowledge (documents, notes, links) with tag-based organization and multi-device sync via Turso.

**Scope:** MVP focused on upload, tag, search, view/download. No AI assistance in V1.

---

## 1. Database Schema

### New Table: `product_knowledge`

```sql
-- UP Migration
CREATE TABLE product_knowledge (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('note', 'document')),

  -- Content & Search
  content TEXT, -- Extracted text for search (required for notes, extracted for docs)

  -- File Storage (for documents only)
  fileData TEXT, -- Base64 encoded file bytes (NULL for notes)
  fileName TEXT, -- Original filename with extension
  fileType TEXT, -- MIME type (e.g., 'application/pdf')
  fileSize INTEGER, -- Bytes

  -- Organization
  tags TEXT, -- JSON array: ["AI tools", "competitor analysis"]

  -- Metadata
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Create index for text search
CREATE INDEX idx_product_knowledge_search ON product_knowledge(title, content);
CREATE INDEX idx_product_knowledge_type ON product_knowledge(type);

-- DOWN Migration
DROP INDEX IF EXISTS idx_product_knowledge_search;
DROP INDEX IF EXISTS idx_product_knowledge_type;
DROP TABLE IF EXISTS product_knowledge;
```

**Field Details:**

| Field       | Type    | Nullable | Description                                                            |
| ----------- | ------- | -------- | ---------------------------------------------------------------------- |
| `id`        | TEXT    | No       | Generated UUID-like ID                                                 |
| `title`     | TEXT    | No       | User-provided or extracted from filename                               |
| `type`      | TEXT    | No       | `"note"` or `"document"`                                               |
| `content`   | TEXT    | Yes      | Extracted text for search. Required for notes, extracted for PDFs/DOCX |
| `fileData`  | TEXT    | Yes      | Base64 encoded file bytes. NULL for notes                              |
| `fileName`  | TEXT    | Yes      | Original filename. NULL for notes                                      |
| `fileType`  | TEXT    | Yes      | MIME type. NULL for notes                                              |
| `fileSize`  | INTEGER | Yes      | Bytes. NULL for notes                                                  |
| `tags`      | TEXT    | Yes      | JSON array of tag strings                                              |
| `createdAt` | TEXT    | No       | ISO 8601 timestamp                                                     |
| `updatedAt` | TEXT    | No       | ISO 8601 timestamp                                                     |

**Size Estimates:**

- 1 MB PDF → ~1.4 MB Base64 → Acceptable
- 100 docs × 1.4 MB = 140 MB << 9GB free tier
- Text content adds minimal overhead

---

## 2. Zustand State Extensions

### Type Definitions (`src/domain/types.ts`)

```typescript
export interface ProductKnowledgeItem {
  id: string;
  title: string;
  type: "note" | "document";
  content?: string; // Extracted text

  // File metadata (documents only)
  fileData?: string; // Base64
  fileName?: string;
  fileType?: string;
  fileSize?: number;

  tags?: string[]; // Array of tag strings

  createdAt: string;
  updatedAt: string;
}
```

### State Slice (`src/domain/state.ts`)

```typescript
// Add to AppState interface
export interface AppState {
  // ... existing state

  productKnowledge: ProductKnowledgeItem[];

  // ... existing actions

  // Product Knowledge Actions
  addKnowledgeItem: (item: ProductKnowledgeItem) => void;
  updateKnowledgeItem: (
    id: string,
    updates: Partial<ProductKnowledgeItem>,
  ) => void;
  deleteKnowledgeItem: (id: string) => void;
}

// Implementation
export const useAppStore = create<AppState>()(
  immer((set, get) => ({
    // ... existing state

    productKnowledge: [],

    // ... existing actions

    addKnowledgeItem: (item) =>
      set((state) => {
        state.productKnowledge = [item, ...state.productKnowledge];

        enqueue({
          type: "insert",
          table: "productKnowledge",
          data: {
            id: item.id,
            title: item.title,
            type: item.type,
            content: item.content || null,
            fileData: item.fileData || null,
            fileName: item.fileName || null,
            fileType: item.fileType || null,
            fileSize: item.fileSize || null,
            tags: item.tags ? JSON.stringify(item.tags) : null,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          },
        });
      }),

    updateKnowledgeItem: (id, updates) =>
      set((state) => {
        const item = state.productKnowledge.find((i) => i.id === id);
        if (!item) return;

        Object.assign(item, updates);
        item.updatedAt = new Date().toISOString();

        enqueue({
          type: "update",
          table: "productKnowledge",
          id,
          data: {
            ...updates,
            tags: updates.tags ? JSON.stringify(updates.tags) : undefined,
            updatedAt: item.updatedAt,
          },
        });
      }),

    deleteKnowledgeItem: (id) =>
      set((state) => {
        state.productKnowledge = state.productKnowledge.filter(
          (i) => i.id !== id,
        );

        enqueue({
          type: "delete",
          table: "productKnowledge",
          id,
        });
      }),
  })),
);
```

### Initialization (Load from DB)

```typescript
// In initializeAppState() function
const knowledgeRows = await db.select().from(productKnowledgeTable);
set({
  productKnowledge: knowledgeRows.map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type as "note" | "document",
    content: row.content || undefined,
    fileData: row.fileData || undefined,
    fileName: row.fileName || undefined,
    fileType: row.fileType || undefined,
    fileSize: row.fileSize || undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })),
});
```

---

## 3. Text Extraction Utilities

### New File: `src/domain/extractText.ts`

```typescript
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Extract text from Word document (.docx)
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Extract text from any supported document type
 */
export async function extractText(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    return extractTextFromPDF(file);
  }

  if (
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    return extractTextFromDOCX(file);
  }

  // For images or unsupported types, return empty string (no text extraction in V1)
  return "";
}

/**
 * Check if file type supports text extraction
 */
export function supportsTextExtraction(file: File): boolean {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  return (
    fileType === "application/pdf" ||
    fileName.endsWith(".pdf") ||
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  );
}
```

---

## 4. File Storage Utilities

### New File: `src/domain/fileStorage.ts`

```typescript
/**
 * Convert File to Base64 string for storage
 */
export async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

/**
 * Convert Base64 string back to downloadable Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

/**
 * Trigger download of a file from Base64 data
 */
export function downloadFile(
  base64: string,
  fileName: string,
  mimeType: string,
) {
  const blob = base64ToBlob(base64, mimeType);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

---

## 5. UI Component Architecture

### Component Hierarchy

```
ProductKnowledgeView (Main view)
├── SearchBar (filter items)
├── TagCloud (quick filter by tag)
├── ActionBar (Add Note, Upload Document buttons)
├── KnowledgeList
│   └── KnowledgeCard (preview: title, type, tags, date)
└── DetailModal (when item selected)
    ├── Title & Metadata
    ├── Tags (editable)
    ├── Content Preview
    ├── Download Button (documents only)
    └── Delete Button
```

### New Component: `src/components/ProductKnowledgeView.tsx`

**Features:**

- Search bar (filters by title + content + tags)
- Tag cloud for quick filtering
- Grid/list view of items
- Click item → Open detail modal
- Add Note / Upload Document buttons

**State:**

```typescript
const [searchQuery, setSearchQuery] = useState("");
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
const [showAddNoteModal, setShowAddNoteModal] = useState(false);
const [isUploading, setIsUploading] = useState(false);
```

**Filtering Logic:**

```typescript
const filteredItems = productKnowledge.filter((item) => {
  // Text search
  const searchLower = searchQuery.toLowerCase();
  const matchesSearch =
    item.title.toLowerCase().includes(searchLower) ||
    (item.content && item.content.toLowerCase().includes(searchLower)) ||
    (item.tags &&
      item.tags.some((tag) => tag.toLowerCase().includes(searchLower)));

  // Tag filter
  const matchesTags =
    selectedTags.length === 0 ||
    (item.tags && selectedTags.every((tag) => item.tags!.includes(tag)));

  return matchesSearch && matchesTags;
});
```

**Upload Document Handler:**

```typescript
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
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      type: "document",
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
    console.error("Failed to upload document:", error);
    // Show error toast/message
  } finally {
    setIsUploading(false);
    fileInputRef.current!.value = "";
  }
};
```

### New Component: `src/components/KnowledgeDetailModal.tsx`

**Features:**

- Display title, type, tags, dates
- Show content preview (first 500 chars)
- Edit tags (multi-select input)
- Download button (for documents)
- Delete button
- Close button

**Props:**

```typescript
interface KnowledgeDetailModalProps {
  itemId: string | null;
  onClose: () => void;
}
```

### New Component: `src/components/AddNoteModal.tsx`

**Features:**

- Title input
- WysiwygEditor for content
- Tag input (comma-separated or multi-select)
- Save/Cancel buttons

**Implementation:**

```typescript
const handleSave = () => {
  const item: ProductKnowledgeItem = {
    id: generateId(),
    title: titleInput,
    type: "note",
    content: editorContent,
    tags: tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  addKnowledgeItem(item);
  onClose();
};
```

---

## 6. Sync Layer Extension

### Update: `src/db/sync.ts`

Add new case to switch statement:

```typescript
case "productKnowledge":
  if (change.type === "insert") {
    return db.insert(productKnowledgeTable).values(change.data);
  }
  if (change.type === "update") {
    return db
      .update(productKnowledgeTable)
      .set(change.data)
      .where(eq(productKnowledgeTable.id, change.id));
  }
  if (change.type === "delete") {
    return db
      .delete(productKnowledgeTable)
      .where(eq(productKnowledgeTable.id, change.id));
  }
  break;
```

---

## 7. Schema Migration

### New File: `src/db/migrations/001_product_knowledge.sql`

```sql
-- Create product_knowledge table
CREATE TABLE IF NOT EXISTS product_knowledge (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('note', 'document')),
  content TEXT,
  fileData TEXT,
  fileName TEXT,
  fileType TEXT,
  fileSize INTEGER,
  tags TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS idx_product_knowledge_search
  ON product_knowledge(title, content);

CREATE INDEX IF NOT EXISTS idx_product_knowledge_type
  ON product_knowledge(type);
```

**Apply Migration:**

```bash
# Run via Drizzle Kit
pnpm drizzle-kit push

# Or manual via code in initializeAppState()
await db.run(sql`CREATE TABLE IF NOT EXISTS product_knowledge...`);
```

---

## 8. Sidebar Navigation Update

### Update: `src/components/Sidebar.tsx`

Add new navigation item:

```typescript
import { BookOpen } from 'lucide-react';

// In sidebar items array
{
  id: 'product-knowledge',
  label: 'Product',
  icon: BookOpen,
  view: 'product-knowledge',
}
```

### Update: `src/App.tsx`

Add route for new view:

```typescript
{currentView === 'product-knowledge' && <ProductKnowledgeView />}
```

---

## 9. Dependencies Installation

```bash
# Text extraction libraries
pnpm add pdf-parse mammoth

# Type definitions (if needed)
pnpm add -D @types/pdf-parse
```

---

## 10. Testing Strategy

### Manual Testing Checklist

**Upload Documents:**

- [ ] Upload PDF with text → Verify text extraction + storage
- [ ] Upload DOCX → Verify text extraction + storage
- [ ] Upload image (PNG/JPG) → Verify metadata storage (no text)
- [ ] Upload large file (5+ MB) → Verify performance

**Create Notes:**

- [ ] Create quick note with title + content
- [ ] Create note with tags
- [ ] Edit existing note
- [ ] Delete note

**Search & Filter:**

- [ ] Search by title → Verify results
- [ ] Search by content text → Verify results
- [ ] Search by tag → Verify results
- [ ] Filter by multiple tags → Verify AND logic
- [ ] Clear search → Show all items

**View & Download:**

- [ ] Click document → Open detail modal
- [ ] Download PDF → Verify file opens correctly
- [ ] Download DOCX → Verify file opens correctly
- [ ] View note → Verify content displays

**Tags:**

- [ ] Add tags to new item
- [ ] Edit tags on existing item
- [ ] Remove all tags
- [ ] Tag cloud shows all unique tags
- [ ] Click tag in cloud → Filter by that tag

**Multi-Device Sync:**

- [ ] Add item on Device A → Verify appears on Device B
- [ ] Edit item on Device B → Verify updates on Device A
- [ ] Delete item on Device A → Verify removed on Device B
- [ ] Tag changes sync across devices

**Edge Cases:**

- [ ] Upload file with no text (scanned image) → Handles gracefully
- [ ] Create note with empty content → Shows error or allows
- [ ] Delete item while viewing → Modal closes
- [ ] Upload duplicate filename → Both stored separately

---

## 11. Implementation Order

### Phase 1: Database & State (1 session)

1. Add schema to `src/db/schema.ts`
2. Run migration (Drizzle push)
3. Add Zustand state slice + actions
4. Extend sync layer
5. Test: Add/update/delete via console

### Phase 2: Utilities (30 mins)

1. Create `extractText.ts`
2. Create `fileStorage.ts`
3. Install dependencies: `pdf-parse`, `mammoth`
4. Test: Upload file → Extract text → Convert to Base64

### Phase 3: UI Components (2 sessions)

1. Create `ProductKnowledgeView.tsx` (main view with search)
2. Create `AddNoteModal.tsx`
3. Create `KnowledgeDetailModal.tsx`
4. Update Sidebar with new nav item
5. Update App.tsx routing

### Phase 4: Integration & Testing (1 session)

1. Wire up all handlers (upload, create note, search, delete)
2. Manual testing (follow checklist above)
3. Fix bugs
4. Polish UI

---

## 12. Risk Mitigation

### Risk: Large files slow down app

**Mitigation:**

- Show file size limit warning (e.g., 10 MB max)
- Display loading spinner during upload
- Async file processing (won't block UI)

### Risk: Text extraction fails for complex PDFs

**Mitigation:**

- Try-catch with graceful fallback (store file without text)
- User can still view/download original file
- V2: Add manual text entry option

### Risk: Base64 encoding increases storage

**Mitigation:**

- ~33% overhead is acceptable for hundreds of docs
- Turso free tier: 9GB >> expected usage
- Monitor storage, can optimize in V2

### Risk: Search performance degrades with hundreds of items

**Mitigation:**

- SQLite indexes on title + content
- Client-side filtering good for <1000 items
- V2: Add full-text search (FTS5) if needed

---

## 13. Success Criteria

**MVP is successful if:**

1. Can upload PDF/DOCX and retrieve original file
2. Can create quick notes with WYSIWYG editor
3. Can search across all titles + content + tags
4. Can filter by tags
5. Can download original documents
6. Data syncs across devices via Turso
7. No performance issues with 100+ items

---

## 14. Out of Scope (V2 Features)

- AI summarization of documents
- Semantic search (vector embeddings)
- Link bookmarks
- Folders/categories
- AI chat per document
- Image OCR
- Presentation previews
- Collaborative features
- Version history

---

## Next Steps

**If approved, proceed to Step 4: Implementation**

Will build in order:

1. Database & state layer
2. Extraction utilities
3. UI components
4. Integration & testing

**Estimated time:** 3-4 sessions total

---

**Ready to implement?**
