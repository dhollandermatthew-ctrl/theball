// FILE: src/domain/extractText.ts
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { extractPptxSlides } from 'pptx-content-extractor';
import { writeFile, remove, BaseDirectory } from '@tauri-apps/plugin-fs';
import { tempDir, join } from '@tauri-apps/api/path';

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
    const result = await parser.getText();
    return result.text;
  } catch (err) {
    console.error('PDF parsing error:', err);
    return '';
  }
}

/**
 * Extract text from Word document (.docx)
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (!result.value || result.value.trim().length === 0) {
      console.warn('DOCX extraction returned empty text for:', file.name);
    }
    
    return result.value;
  } catch (err) {
    console.error('DOCX parsing error for', file.name, ':', err);
    return '';
  }
}

/**
 * Extract text from PowerPoint presentation (.pptx)
 */
export async function extractTextFromPPTX(file: File): Promise<string> {
  let tempFileName: string | null = null;
  let tempFilePath: string | null = null;
  
  try {
    // Write file to temp directory (pptx-content-extractor requires file path)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    tempFileName = `pptx_${Date.now()}_${Math.random().toString(36).substring(7)}.pptx`;
    
    // Get actual temp directory path
    const tempDirPath = await tempDir();
    tempFilePath = await join(tempDirPath, tempFileName);
    
    await writeFile(tempFileName, buffer, {
      baseDir: BaseDirectory.Temp,
    });
    
    // Extract slides using full file path
    const slides = await extractPptxSlides(tempFilePath);
    
    // Combine all slide text
    // Each slide has content array with text elements containing string arrays
    const allText = slides
      .flatMap((slide) => 
        slide.content.flatMap((element) => element.text)
      )
      .filter(Boolean)
      .join('\n');
    
    return allText;
  } catch (err) {
    console.error('PPTX parsing error:', err);
    return '';
  } finally {
    // Clean up temp file
    if (tempFileName) {
      try {
        await remove(tempFileName, { baseDir: BaseDirectory.Temp });
      } catch (cleanupErr) {
        console.warn('Failed to clean up temp PPTX file:', cleanupErr);
      }
    }
  }
}

/**
 * Extract text from any supported document type
 */
export async function extractText(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  }
  
  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return extractTextFromDOCX(file);
  }
  
  if (
    fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    fileName.endsWith('.pptx')
  ) {
    return extractTextFromPPTX(file);
  }
  
  // For images or unsupported types, return empty string (no text extraction in V1)
  return '';
}

/**
 * Check if file type supports text extraction
 */
export function supportsTextExtraction(file: File): boolean {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  return (
    fileType === 'application/pdf' ||
    fileName.endsWith('.pdf') ||
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx') ||
    fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    fileName.endsWith('.pptx')
  );
}
