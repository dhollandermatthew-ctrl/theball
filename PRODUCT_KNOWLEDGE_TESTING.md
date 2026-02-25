# Product Knowledge Feature - Testing Checklist

## Feature Overview

Product Knowledge Repository allows you to store, organize, and search PM knowledge (documents, notes) with tag-based filtering.

## Test Coverage

### ✅ Phase 1: Navigation & UI

- [ ] Click "Product" in sidebar (purple BookOpen icon)
- [ ] Verify ProductKnowledgeView loads with empty state message
- [ ] Verify header shows "Product Knowledge" title
- [ ] Verify search bar is visible
- [ ] Verify "Add Note" and "Upload Document" buttons are visible

---

### ✅ Phase 2: Create Quick Notes

**Test Case 1: Basic Note Creation**

- [ ] Click "Add Note" button
- [ ] Modal opens with title input, WYSIWYG editor, tags input
- [ ] Enter title: "AI Prompting Best Practices"
- [ ] Enter content: "Always provide context. Use examples. Be specific."
- [ ] Enter tags: "AI, prompting, best practices"
- [ ] Click "Save Note"
- [ ] Note appears in grid with green icon
- [ ] Note displays title, content preview (truncated), tags (max 3 visible)
- [ ] Note shows creation date

**Test Case 2: Note Without Tags**

- [ ] Create note without tags
- [ ] Verify note saves successfully
- [ ] Verify no tag chips displayed

**Test Case 3: Cancel Note Creation**

- [ ] Click "Add Note"
- [ ] Fill in some data
- [ ] Click "Cancel"
- [ ] Verify modal closes without saving

---

### ✅ Phase 3: Upload Documents

**Test Case 4: Upload PDF**

- [ ] Click "Upload Document"
- [ ] Select a PDF file (e.g., research paper, presentation)
- [ ] Verify "Uploading..." text appears
- [ ] Document appears in grid with blue FileText icon
- [ ] Title = filename (without extension)
- [ ] Content = extracted text (first 200 chars visible)
- [ ] Metadata shows: filename, file size
- [ ] Upload button resets after success

**Test Case 5: Upload DOCX**

- [ ] Upload a Word document
- [ ] Verify text extraction works
- [ ] Verify document displays correctly

**Test Case 6: Upload Image (Metadata Only)**

- [ ] Upload PNG/JPG file
- [ ] Verify it saves (no text extraction in V1)
- [ ] Content should be empty
- [ ] Metadata should show filename

**Test Case 7: Upload Error Handling**

- [ ] Try uploading very large file (>10MB)
- [ ] Verify graceful error handling
- [ ] File input should reset

---

### ✅ Phase 4: Search & Filtering

**Test Case 8: Search by Title**

- [ ] Create multiple notes with different titles
- [ ] Type keyword in search bar
- [ ] Verify only matching items display
- [ ] Clear search → all items return

**Test Case 9: Search by Content**

- [ ] Search for word in note content
- [ ] Verify matching notes appear

**Test Case 10: Search by Tag**

- [ ] Search for tag name
- [ ] Verify items with that tag appear

**Test Case 11: Tag Cloud Filtering**

- [ ] Create notes with tags: "AI", "framework", "competitor"
- [ ] Verify tag cloud displays all unique tags
- [ ] Click "AI" tag → only AI-tagged items show
- [ ] Tag turns blue when selected
- [ ] Click same tag again → deselect, all items return

**Test Case 12: Multi-Tag Filtering**

- [ ] Select multiple tags from cloud
- [ ] Verify only items with ALL selected tags show (AND logic)
- [ ] Click "Clear all tags" button if it appears
- [ ] All items return

**Test Case 13: Combined Search + Tag**

- [ ] Type search query + select tag
- [ ] Verify items match both criteria
- [ ] Clear search → filter by tag only
- [ ] Clear tag → filter by search only

---

### ✅ Phase 5: View Item Details

**Test Case 14: Open Note Detail**

- [ ] Click a note card
- [ ] Detail modal opens
- [ ] Displays: title, type (Note), creation date, updated date
- [ ] Tags section shows all tags
- [ ] Content preview shows full content (or first 2000 chars)
- [ ] "Close" button works

**Test Case 15: Open Document Detail**

- [ ] Click a document card
- [ ] Modal displays: title, type (Document), filename, file size, dates
- [ ] Content preview shows extracted text
- [ ] "Download" button is visible

---

### ✅ Phase 6: Edit Tags

**Test Case 16: Edit Tags on Existing Item**

- [ ] Open detail modal for any item
- [ ] Click "Edit" next to Tags
- [ ] Input becomes editable
- [ ] Add new tag: "testing, edited"
- [ ] Click "Save"
- [ ] Modal updates immediately
- [ ] Click "Cancel" during edit → no changes saved

**Test Case 17: Remove All Tags**

- [ ] Edit tags, clear all text
- [ ] Save
- [ ] Verify "No tags" message appears

---

### ✅ Phase 7: Download Documents

**Test Case 18: Download PDF**

- [ ] Open document detail (PDF)
- [ ] Click "Download" button
- [ ] File downloads to ~/Downloads
- [ ] Verify file opens correctly
- [ ] Filename matches original

**Test Case 19: Download DOCX**

- [ ] Repeat for Word document
- [ ] Verify integrity of downloaded file

---

### ✅ Phase 8: Delete Items

**Test Case 20: Delete Note**

- [ ] Open note detail
- [ ] Click "Delete" button
- [ ] Confirm deletion in alert
- [ ] Modal closes
- [ ] Note removed from grid
- [ ] Verify localStorage/Turso updated (check DevTools)

**Test Case 21: Delete Document**

- [ ] Delete a document
- [ ] Verify it's removed from grid
- [ ] Verify fileData removed from database (saves space)

**Test Case 22: Cancel Delete**

- [ ] Click Delete → Cancel in confirmation
- [ ] Item remains

---

### ✅ Phase 9: Edge Cases & UX

**Test Case 23: Empty State**

- [ ] Delete all items
- [ ] Verify empty state message: "No knowledge items yet..."

**Test Case 24: No Search Results**

- [ ] Search for non-existent term
- [ ] Verify empty state: "No items match your search or filters."

**Test Case 25: Long Titles**

- [ ] Create note with very long title (100+ chars)
- [ ] Verify title truncates with ellipsis in grid
- [ ] Full title visible in detail modal

**Test Case 26: Large Content**

- [ ] Upload document with 5000+ words
- [ ] Verify content truncates in preview
- [ ] Detail modal shows first 2000 chars + "..."

**Test Case 27: Special Characters in Tags**

- [ ] Create note with tags: "C++, .NET, AI/ML"
- [ ] Verify parsing works (trim spaces, handle special chars)

**Test Case 28: Responsive Layout**

- [ ] Resize window to mobile width
- [ ] Grid collapses to 1 column
- [ ] Modals are responsive
- [ ] Sidebar toggles

---

### ✅ Phase 10: Multi-Device Sync (Critical!)

**Test Case 29: Create on Device A**

- [ ] Add note or upload document
- [ ] Wait 2 seconds (debounced sync)
- [ ] Check Turso database (via Drizzle Studio or SQL)
- [ ] Verify `product_knowledge` table has new row

**Test Case 30: Sync to Device B**

- [ ] Open app on second device
- [ ] Navigate to Product view
- [ ] Verify item created on Device A appears
- [ ] Check timestamp matches

**Test Case 31: Edit Tags on Device B**

- [ ] Edit tags on item
- [ ] Check Device A after refresh/re-navigation
- [ ] Verify tags updated

**Test Case 32: Delete on Device A**

- [ ] Delete item on Device A
- [ ] Check Device B
- [ ] Item should disappear after sync

---

### ✅ Phase 11: Data Integrity

**Test Case 33: Base64 Encoding**

- [ ] Upload document
- [ ] Check browser DevTools → Network → Check payload size
- [ ] Open Turso, query: `SELECT length(fileData) FROM product_knowledge WHERE type='document';`
- [ ] Verify fileData is Base64 string
- [ ] Download and verify file integrity

**Test Case 34: Large File Upload**

- [ ] Upload 5MB PDF
- [ ] Verify no performance issues
- [ ] Verify Turso doesn't hit size limits (unlikely with 9GB free tier)

**Test Case 35: JSON Tags Storage**

- [ ] Create item with tags: "AI, tools, frameworks"
- [ ] Query Turso: `SELECT tags FROM product_knowledge WHERE id='...';`
- [ ] Verify tags stored as JSON array: `["AI","tools","frameworks"]`

---

### ✅ Phase 12: AI Integration (Out of Scope for V1)

_Future: AI-powered tagging suggestions, semantic search, auto-summarization_

- [ ] No AI features in V1 - manual tagging only

---

## Performance Benchmarks

- [ ] Search response time < 100ms (client-side filtering)
- [ ] Upload + text extraction < 3 seconds (PDF)
- [ ] Modal open/close animations smooth
- [ ] Grid renders 100+ items without lag

---

## Known Limitations (V1)

✅ **Expected behaviors (not bugs):**

- No OCR for images (metadata only)
- No folders (tags only)
- No AI-powered features
- Search is case-insensitive substring match (not fuzzy)
- Base64 storage adds ~33% overhead (acceptable)
- No multi-file upload (one at a time)

---

## Bugs Found

_Document any issues here:_

| #   | Description | Severity | Steps to Reproduce |
| --- | ----------- | -------- | ------------------ |
| 1   |             |          |                    |
| 2   |             |          |                    |

---

## Test Results Summary

- **Date**: ****\_\_\_****
- **Tester**: Matthew D'Hollander
- **Total Tests**: 35
- **Passed**: \_\_\_
- **Failed**: \_\_\_
- **Blocked**: \_\_\_

---

## Sign-Off

- [ ] All critical tests pass (P1: nav, create, search, sync)
- [ ] No blocking bugs
- [ ] Ready for daily use
- [ ] ProjectContext.md updated

**Approved by**: ****\_\_\_****  
**Date**: ****\_\_\_****
