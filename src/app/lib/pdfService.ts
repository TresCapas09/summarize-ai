import * as pdfjsLib from 'pdfjs-dist';

// Point the worker to the bundled worker file from pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  wordCount: number;
  isScanned: boolean;
  images?: string[]; // Array of Base64 strings for scanned pages
}

/**
 * Renders a specific PDF page to a Base64 image string.
 * Used for "Vision Mode" when a page is a scan/image.
 */
async function renderPageToImage(page: any): Promise<string> {
  const viewport = page.getViewport({ scale: 2.0 }); // High resolution for better AI reading
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) throw new Error('Could not create canvas context');
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  return canvas.toDataURL('image/jpeg', 0.85); // Return as high-quality JPEG Base64
}

/**
 * Extracts all text content from a PDF file.
 * Runs entirely in the browser — the file is never uploaded.
 *
 * @param file - The PDF File object from a file input or drag-and-drop event
 * @returns An extraction result with the text and metadata
 */
export async function extractTextFromPDF(
  file: File
): Promise<PDFExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pageCount = pdf.numPages;
  const pageTexts: string[] = [];
  const images: string[] = [];
  let totalWordCount = 0;

  // Step 3: Loop through each page and extract text or image
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    // Yield to main thread to keep UI responsive on low-end laptops during heavy PDF parsing
    await new Promise(resolve => setTimeout(resolve, 0));

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const pageWordCount = pageText.split(/\s+/).filter(w => w.length > 0).length;

    if (pageWordCount > 5) {
      // If there's enough digital text, use it
      pageTexts.push(pageText);
      totalWordCount += pageWordCount;
    } else {
      // If the page is empty/scanned, capture it as an image (Limit to first 5 scans for cost)
      if (images.length < 5) {
        const base64Image = await renderPageToImage(page);
        images.push(base64Image);
      }
    }
  }

  const fullText = pageTexts.join('\n\n').trim();

  return {
    text: fullText,
    pageCount,
    wordCount: totalWordCount,
    isScanned: totalWordCount === 0 && images.length > 0,
    images: images.length > 0 ? images : undefined,
  };
}
