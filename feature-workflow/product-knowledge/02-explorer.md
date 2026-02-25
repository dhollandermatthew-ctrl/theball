# Step 2: Explorer - Codebase Survey

## Feature: Product Knowledge Repository

> **Context Note:** Always reference [ProjectContext.md](../../ProjectContext.md) for complete system architecture and product philosophy.

---

## Objective

Survey existing codebase patterns for file handling, text extraction, state management, and UI components to inform implementation plan for Product Knowledge Repository.

---

## Key Findings

### 1. File Upload Pattern (Health View)

**Location:** [src/components/HealthView.tsx](../../src/components/HealthView.tsx)

**Pattern:**

```tsx
const fileInputRef = useRef<HTMLInputElement>(null);

const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setIsUploading(true);
  try {
    const record = await extractBloodWorkFromFile(file);
    addBloodwork(record); // Zustand action
  } catch (error) {
    // Handle quota errors, show error message
  } finally {
    setIsUploading(false);
    fileInputRef.current.value = ""; // Reset input
  }
};

// Hidden file input
<input
  ref={fileInputRef}
  type="file"
  accept=".pdf,image/*"
  onChange={handleFileSelect}
  style={{ display: "none" }}
/>

// Trigger button
<button onClick={() => fileInputRef.current?.click()}>
  Upload
</button>
```

**Reusable for Product Knowledge:** ✅ Yes, same pattern

---

### 2. File Storage Strategy (Current Implementation)

**Health Tables:** [src/db/schema.ts](../../src/db/schema.ts#L120-L145)

```typescript
export const healthBloodwork = sqliteTable("health_bloodwork", {
  sourceType: text("sourceType").notNull(), // pdf|image|manual
  sourceFileName: text("sourceFileName"), // Original filename
  labValues: text("labValues").notNull(), // JSON extracted data
  // NO file bytes storage - file is discarded after extraction
});
```

**Key Insight:** Current health implementation extracts data from files but **doesn't persist the original file**. Only metadata + extracted content stored.

**Trade-off for Product Knowledge:**

- **Option A (Current Pattern):** Extract text, store metadata, discard file
  - ✅ Smaller DB size
  - ❌ Can't view/download original document later
  - ❌ Defeats purpose of "repository"

- **Option B (New Pattern):** Store file bytes in Turso
  - ✅ True document repository
  - ✅ Multi-device sync (files in DB)
  - ❌ Larger DB size (but hundreds of docs = manageable)

**Recommendation:** Option B - Store file bytes in blob column. This is a repository, not just extraction.

---

### 3. Text Extraction (AI Vision)

**Location:** [src/domain/ai/bloodwork.ts](../../src/domain/ai/bloodwork.ts), [src/domain/ai/fitness.ts](../../src/domain/ai/fitness.ts)

**Current Pattern:**

- PDFs → Gemini Vision API (multimodal)
- Images → Gemini Vision API
- Uses `file.arrayBuffer()` → Base64 encoding → API

**Limitation:** Uses AI for extraction (costs tokens, rate limited)

**For Product Knowledge:**

- PDFs: Should use **text extraction library** (pdf-parse) - no AI needed for most docs
- Word docs: Should use **mammoth** library (converts DOCX → HTML/text)
- Images: Could use Gemini OCR, but optional for V1

**Libraries Needed (not currently installed):**

- `pdf-parse` - Extract text from PDFs (no AI)
- `mammoth` - Extract text from DOCX
- Optional: `xlsx` for Excel files (future)

---

### 4. State Management Pattern (Zustand)

**Location:** [src/domain/state.ts](../../src/domain/state.ts#L600-L700)

**Health CRUD Pattern:**

```typescript
// State slice
healthData: {
  bloodWorkRecords: [],
  // ...
}

// Actions
addBloodwork: (record) => set((state) => {
  state.healthData.bloodWorkRecords = [record, ...state.healthData.bloodWorkRecords];
  enqueue({ type: "insert", table: "healthBloodwork", data: {...} });
}),

updateBloodwork: (id, updates) => set((state) => {
  const record = state.healthData.bloodWorkRecords.find(r => r.id === id);
  Object.assign(record, updates);
  enqueue({ type: "update", table: "healthBloodwork", id, data: updates });
}),

deleteBloodwork: (id) => set((state) => {
  state.healthData.bloodWorkRecords = state.healthData.bloodWorkRecords.filter(r => r.id !== id);
  enqueue({ type: "delete", table: "healthBloodwork", id });
}),
```

**For Product Knowledge:**

```typescript
// New state slice
productKnowledge: {
  items: [], // All knowledge items
}

// New actions
addKnowledgeItem: (item) => { /* ... */ },
updateKnowledgeItem: (id, updates) => { /* ... */ },
deleteKnowledgeItem: (id) => { /* ... */ },
```

**Pattern:** ✅ Exactly the same, proven approach

---

### 5. WYSIWYG Editor (Quick Notes)

**Location:** [src/components/WysiwygEditor.tsx](../../src/components/WysiwygEditor.tsx)

**Usage Example:** [src/components/MeetingSpaceView.tsx](../../src/components/MeetingSpaceView.tsx#L530)

```tsx
<WysiwygEditor
  initialContent={note.content}
  onChange={(html) => setEditingContent(html)}
  onBlur={() => saveNote()}
  placeholder="Add space notes..."
  autoFocus
/>
```

**Features:**

- Rich text editing (contentEditable div)
- Markdown support
- Voice-to-text integration (mic button)
- Built-in toolbar (bold, italic, lists, etc.)

**For Product Knowledge:** ✅ Reuse for "Quick Notes" feature

---

### 6. Search Functionality

**Location:** [src/components/SearchModal.tsx](../../src/components/SearchModal.tsx)

**Current Implementation:**

- Modal overlay with input
- Searches tasks + 1-on-1 items + people
- Simple `.includes()` text matching
- Shows results grouped by type

**For Product Knowledge:**

- Could extend SearchModal to include knowledge items
- Or create dedicated ProductKnowledgeView with inline search
- **Recommendation:** Dedicated view (cleaner separation)

---

### 7. Database Schema Patterns

**Location:** [src/db/schema.ts](../../src/db/schema.ts)

**Common Patterns:**

- Text IDs (generated via `generateId()`)
- JSON columns for complex data (e.g., `labValues: text()` stores JSON array)
- Timestamps (createdAt, updatedAt as ISO strings)
- Foreign keys via text references (no formal FK constraints)

**For Product Knowledge Table:**

```typescript
export const productKnowledge = sqliteTable("product_knowledge", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // "note"|"document"
  content: text("content"), // Extracted text (searchable)
  tags: text("tags"), // JSON array of tag strings

  // File storage (Option B)
  fileData: text("fileData"), // Base64 encoded file bytes (nullable for notes)
  fileName: text("fileName"), // Original filename
  fileType: text("fileType"), // MIME type
  fileSize: integer("fileSize"), // Bytes

  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});
```

---

### 8. Sync Layer

**Location:** [src/db/sync.ts](../../src/db/sync.ts)

**Pattern:**

```typescript
// Queue-based sync
enqueue({ type: "insert", table: "healthBloodwork", data: {...} });

// In sync.ts, switch statement handles all tables
case "healthBloodwork":
  if (change.type === "insert") return db.insert(healthBloodwork).values(change.data);
  // ...
```

**For Product Knowledge:**

- Add new case to sync.ts switch statement
- Handle insert/update/delete for productKnowledge table

---

### 9. Sidebar Navigation

**Location:** [src/components/Sidebar.tsx](../../src/components/Sidebar.tsx)

**Current Items:**

- Calendar
- Goals
- Meetings
- Health

**For Product Knowledge:**

- Add new "Product" or "Knowledge" sidebar item
- Icon suggestion: `BookOpen` or `Library` from lucide-react

---

## Technology Gaps

### New Dependencies Required

1. **pdf-parse** - PDF text extraction

   ```bash
   pnpm add pdf-parse
   ```

2. **mammoth** - Word document text extraction

   ```bash
   pnpm add mammoth
   ```

3. **Optional:** `@types` for TypeScript support if needed

---

## Implementation Complexity Assessment

### Low Complexity (Reuse Existing) ✅

- File upload UI (copy HealthView pattern)
- WYSIWYG editor (reuse component)
- Zustand state management (proven pattern)
- Database sync (extend existing system)
- Sidebar navigation (add one item)

### Medium Complexity ⚠️

- Text extraction (new libraries, error handling)
- File storage in DB (blob encoding/decoding)
- Search UI (new component, but simple)
- Tag management (multi-select UI)

### High Complexity ❌

- None for MVP

---

## Recommended File Storage Approach

### Store Files as Base64 Text in Turso

**Why:**

1. **Multi-device sync works automatically** - Files in DB, not file system
2. **Simpler implementation** - No file path resolution across devices
3. **Consistent with Turso approach** - Everything in one place
4. **Manageable size** - Few hundred PDFs << 9GB free tier

**Implementation:**

```typescript
// Store file
const arrayBuffer = await file.arrayBuffer();
const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

// Retrieve file
const binary = atob(base64);
const bytes = new Uint8Array(binary.split("").map((c) => c.charCodeAt(0)));
const blob = new Blob([bytes], { type: fileType });
```

**Alternative (Not Recommended for V1):**

- Store files in Tauri file system (BaseDirectory.AppData)
- Store file paths in DB
- Requires manual sync strategy across devices

---

## UI Component Reuse Map

| Feature            | Existing Component | Reuse Strategy                 |
| ------------------ | ------------------ | ------------------------------ |
| File Upload Button | HealthView upload  | Copy pattern                   |
| Quick Note Editor  | WysiwygEditor      | Direct reuse                   |
| Sidebar Item       | Sidebar nav        | Add new item                   |
| List/Grid View     | MeetingHub spaces  | Copy layout pattern            |
| Detail View        | MeetingSpaceView   | Similar structure              |
| Search Input       | SearchModal        | New component, similar pattern |
| Tag Pills          | None (new)         | Custom, simple implementation  |

---

## Next Steps

**If approved, proceed to Step 3: Plan**

Will detail:

1. Complete schema design (all fields, indexes)
2. Text extraction implementation (pdf-parse, mammoth)
3. File encoding/decoding utilities
4. Zustand state slice + actions
5. UI component hierarchy
6. Migration strategy
7. Testing approach

---

**Dependencies to install:**

```bash
pnpm add pdf-parse mammoth
```

**Estimated timeline:**

- Planning: 1 session
- Implementation: 2-3 sessions
- Testing: 1 session

**Risk level:** Low (leverages proven patterns)

---

**Ready to proceed to Step 3 (Plan)?**
