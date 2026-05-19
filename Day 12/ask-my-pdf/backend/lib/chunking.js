export function fixedSizeChunking(text, chunkSize = 2000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push({ text: text.substring(i, i + chunkSize) });
  }
  return chunks;
}

export function slidingWindowChunking(text, chunkSize = 2000, overlap = 400) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push({ text: text.substring(i, i + chunkSize) });
    if (i + chunkSize >= text.length) break;
    i += (chunkSize - overlap);
  }
  return chunks;
}

export function semanticChunking(text) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  const chunks = [];
  let currentChunk = "";
  
  for (const p of paragraphs) {
    if (currentChunk.length + p.length < 1500 && currentChunk.length > 0) {
      currentChunk += "\n\n" + p;
    } else {
      if (currentChunk) chunks.push({ text: currentChunk });
      currentChunk = p;
    }
  }
  if (currentChunk) chunks.push({ text: currentChunk });
  return chunks;
}

export function hierarchicalChunking(text) {
  const chunks = [];
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  
  let currentSectionTitle = "Document Start";
  let currentChunk = "";
  
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (p.length < 150 && !p.match(/[.!?:]$/)) {
      if (currentChunk) {
        chunks.push({
          text: `[Section: ${currentSectionTitle}]\n${currentChunk}`,
          metadata: { section: currentSectionTitle }
        });
        currentChunk = "";
      }
      currentSectionTitle = p;
    } else {
      if (currentChunk.length + p.length < 1500 && currentChunk.length > 0) {
        currentChunk += "\n\n" + p;
      } else {
        if (currentChunk) {
          chunks.push({
            text: `[Section: ${currentSectionTitle}]\n${currentChunk}`,
            metadata: { section: currentSectionTitle }
          });
        }
        currentChunk = p;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push({
      text: `[Section: ${currentSectionTitle}]\n${currentChunk}`,
      metadata: { section: currentSectionTitle }
    });
  }
  
  if (chunks.length === 0) {
    return fixedSizeChunking(text, 2000);
  }
  
  return chunks;
}
