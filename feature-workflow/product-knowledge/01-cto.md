# Step 1: CTO - Clarification

## Feature: Product Knowledge Repository

> **Context Note:** Always reference [ProjectContext.md](../../ProjectContext.md) for complete system architecture and product philosophy.

---

## Request Summary

**User Need:**
Matthew wants a searchable repository of all product management knowledge accumulated over his career. This includes:

- PM frameworks, techniques, and learnings
- Tool comparisons and decision criteria (e.g., "when to use Google AI Studio vs X")
- Research documents (competitor analysis, market research)
- Presentations and case studies
- Quick notes from conversations/meetings

**Primary Use Case:**
"I need to research competitors → Search my product database → Find that note I made 3 years ago about Google Deep Research → Avoid duplicate work → Make informed decision"

**Current Pain:**

- Knowledge scattered across Google Drive (where it "goes to die")
- No single searchable interface for PM knowledge
- Can't remember what he has or where it is
- Friction to access prevents actual usage

---

## Clarified Requirements

### Content Types (All Supported)

1. **Documents**: PDFs, images, Word docs, presentations
2. **Quick Notes**: Text entries (option to create inline or via Word doc file)
3. **Links**: Bookmarked URLs with metadata (V2, not MVP)

### Search & Organization

- **Text search**: Title + extracted content (PDFs, docs, images)
- **Tags**: Multiple tags per item, optional, user-defined
- **No folders**: Start tag-only, can add in V2 if needed
- **No AI assistance**: Straight repository, no auto-summarization (V2 enhancement)

### Scale

- Starting: 10-50 items
- Expected growth: Hundreds over time

### Storage

- All files stored locally (Tauri file system)
- Metadata + extracted text in Turso
- Multi-device sync via Turso (file paths need handling)

---

## CTO Assessment

### ✅ **This fits The Ball's philosophy**

**Why it works:**

- "Execution, thinking, and **memory**" - this IS memory serving execution
- Longitudinal pattern awareness for product knowledge (same as health tracking)
- Solves real friction: Drive search is broken, knowledge gets lost
- Weekly/monthly trigger: research → recall past work → make decision

**Alignment with 80/20:**

- This is supporting infrastructure (20% bucket)
- Serves execution: Better decisions → Better task outcomes
- Not passive archiving - active learning capture

### 🚨 **Key Risks**

1. **File extraction complexity**
   - PDFs: Need text extraction (node library? Gemini vision?)
   - Word docs: Conversion required
   - Images: May need OCR or skip text search for images

2. **Multi-device file sync**
   - Turso has metadata, but files are local
   - Need strategy: Store file bytes in Turso? Or cloud storage URLs?

3. **Search performance**
   - Simple SQL LIKE queries may be slow with hundreds of docs
   - Full-text search index needed? (SQLite FTS5?)

4. **Scope creep risk**
   - "Add AI chat per document" → Feature explosion
   - Keep V1 simple: Upload, tag, search, view

### ❓ **Open Questions**

1. **File storage strategy:**
   - Option A: Store file bytes in Turso (blob column) - syncs automatically
   - Option B: Store files locally, sync metadata only - requires file path handling across devices
   - **Recommendation:** Start with Option A (simpler sync), optimize later if storage becomes issue

2. **Text extraction approach:**
   - PDFs: Use `pdf-parse` npm library (no AI needed)
   - Word docs: Use `mammoth` npm library (converts to HTML/text)
   - Images: Skip text search in V1? Or OCR with Gemini vision?
   - **Recommendation:** PDF + Word text extraction in V1, images metadata-only

3. **Quick notes UI:**
   - Inline text editor (like space notes)?
   - Or always "upload Word doc" workflow?
   - **Recommendation:** Inline editor (reuse WysiwygEditor component)

4. **Search UI:**
   - Dedicated "Product Knowledge" sidebar view?
   - Or integrate into existing SearchModal?
   - **Recommendation:** New sidebar view (cleaner separation)

---

## Proposed Scope (MVP)

### In Scope ✅

- Upload PDFs, Word docs (text extraction)
- Upload images (metadata only, no text search)
- Create quick notes (inline WYSIWYG editor)
- Multi-tag support (comma-separated input)
- Text search: title + content + tags
- View/download uploaded files
- Delete items
- Store files as blobs in Turso (multi-device sync)

### Out of Scope (V2) ⏭️

- AI summarization
- Semantic search
- Links/bookmarks
- Folders/categories
- AI chat per document
- Image OCR/text extraction

---

## What You Need to Decide

1. **File storage:** Blob column in Turso (auto-sync) vs local files (manual sync)?
   - **My recommendation:** Turso blobs for V1 simplicity

2. **Images in V1:** Metadata-only (no text search) or add Gemini OCR?
   - **My recommendation:** Metadata-only to avoid rate limiting

3. **Quick notes:** Inline editor or always file upload?
   - **My recommendation:** Inline editor (lower friction)

4. **Should we proceed?** Does this clarification match your vision? Any red flags?

---

## Next Steps (If Approved)

1. **Step 2: Explorer** - Survey codebase (file handling patterns, existing search, WYSIWYG reuse)
2. **Step 3: Plan** - Schema design, extraction libs, UI components, migration strategy
3. **Step 4-7: Implementation** → Review → Testing → Deployment

**Estimated complexity:** Medium (new table, file handling, text extraction, new UI view)

---

**Sign-off needed before proceeding to Step 2.**
