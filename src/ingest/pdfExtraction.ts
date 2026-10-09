import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_PDF_PAGES = 80;
const MAX_ATTACHMENT_TEXT_CHARS = 48_000;

function normalizeText(text: string): string {
  return text.replace(/\u0000/g, '').replace(/\r\n?/g, '\n').replace(/[\t ]+\n/g, '\n').trim();
}

export async function extractPdfText(data: ArrayBuffer): Promise<{ text: string; note?: string }> {
  const loadingTask = pdfjs.getDocument({ data });
  const document = await loadingTask.promise;
  try {
    const pageCount = Math.min(document.numPages, MAX_PDF_PAGES);
    const pages: string[] = [];
    let length = 0;
    for (let pageNumber = 1; pageNumber <= pageCount && length < MAX_ATTACHMENT_TEXT_CHARS; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => typeof item.str === 'string' ? item.str : '').join(' ');
      const pageText = normalizeText(text);
      pages.push(`[Page ${pageNumber}]\n${pageText}`);
      length += pageText.length;
    }
    const text = pages.join('\n\n').slice(0, MAX_ATTACHMENT_TEXT_CHARS);
    const note = document.numPages > MAX_PDF_PAGES ? `Read first ${MAX_PDF_PAGES} of ${document.numPages} pages.` : undefined;
    return { text, note: text ? note : 'No selectable text was found. Scanned PDFs need OCR before their contents can be used.' };
  } finally {
    await loadingTask.destroy();
  }
}
