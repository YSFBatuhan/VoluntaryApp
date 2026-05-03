export function normalizeText(value = '') {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildKeywords(values = []) {
  const words = values
    .flatMap((value) => normalizeText(value).split(' '))
    .filter((word) => word.length >= 2);

  return [...new Set(words)].slice(0, 30);
}

export function splitTextIntoChunks(pages, targetSize = 3200) {
  const chunks = [];
  let buffer = '';
  let pageStart = 1;

  function pushChunk(pageEnd) {
    const text = buffer.trim();
    if (!text) return;

    chunks.push({
      order: chunks.length + 1,
      pageStart,
      pageEnd,
      text,
      charCount: text.length,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    });
    buffer = '';
    pageStart = pageEnd + 1;
  }

  pages.forEach((page) => {
    const cleanText = page.text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    if (!buffer) pageStart = page.pageNumber;
    buffer = `${buffer} ${cleanText}`.trim();

    while (buffer.length >= targetSize) {
      const slicePoint = findSentenceBoundary(buffer, targetSize);
      const current = buffer.slice(0, slicePoint).trim();
      const rest = buffer.slice(slicePoint).trim();

      chunks.push({
        order: chunks.length + 1,
        pageStart,
        pageEnd: page.pageNumber,
        text: current,
        charCount: current.length,
        wordCount: current.split(/\s+/).filter(Boolean).length,
      });

      buffer = rest;
      pageStart = page.pageNumber;
    }
  });

  if (buffer.trim()) {
    pushChunk(pages.at(-1)?.pageNumber || pageStart);
  }

  return chunks;
}

function findSentenceBoundary(text, targetSize) {
  const min = Math.floor(targetSize * 0.75);
  const max = Math.min(text.length, Math.floor(targetSize * 1.2));
  const windowText = text.slice(min, max);
  const boundaryMatch = [...windowText.matchAll(/[.!?]\s/g)].at(-1);

  if (boundaryMatch) {
    return min + boundaryMatch.index + boundaryMatch[0].length;
  }

  const spaceIndex = text.lastIndexOf(' ', targetSize);
  return spaceIndex > min ? spaceIndex : targetSize;
}
