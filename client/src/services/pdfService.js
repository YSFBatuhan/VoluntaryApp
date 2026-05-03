import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { splitTextIntoChunks } from './textUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_PDF_BYTES = 20 * 1024 * 1024;

export async function extractPdfBook(file) {
  if (!file) {
    throw new Error('PDF dosyasi secilmedi.');
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Lutfen PDF dosyasi secin.');
  }

  if (file.size > MAX_PDF_BYTES) {
    throw new Error('PDF dosyasi 20 MB sinirini asiyor.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pages.push({ pageNumber, text });
  }

  const fullText = pages.map((page) => page.text).join(' ').trim();
  if (fullText.length < 100) {
    throw new Error('PDF icinden yeterli metin cikarilamadi. Bu dosya taranmis/gorsel PDF olabilir.');
  }

  const chunks = splitTextIntoChunks(pages);

  return {
    fileName: file.name,
    bytes: file.size,
    pageCount: pdf.numPages,
    charCount: fullText.length,
    wordCount: fullText.split(/\s+/).filter(Boolean).length,
    chunks,
  };
}
