const TARGET_WORDS = 500;
const OVERLAP_WORDS = 50;

/**
 * Splits text into ~500-word chunks with ~50-word overlap.
 * Strategy: split by double newlines (paragraphs), group paragraphs
 * until we hit ~500 words, then start a new chunk carrying the last
 * paragraph into the next chunk for context overlap.
 */
export function chunkText(text: string): string[] {
  // Normalise whitespace and split into paragraphs
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return [];

  const chunks: string[] = [];
  let currentParagraphs: string[] = [];
  let currentWordCount = 0;

  for (const paragraph of paragraphs) {
    const paragraphWords = paragraph.split(/\s+/).length;

    // If adding this paragraph would exceed target and we already have content,
    // finalise the current chunk
    if (currentWordCount + paragraphWords > TARGET_WORDS && currentWordCount > 0) {
      chunks.push(currentParagraphs.join("\n\n"));

      // Start new chunk with overlap: carry the last paragraph forward
      const lastParagraph = currentParagraphs[currentParagraphs.length - 1];
      const lastWords = lastParagraph.split(/\s+/).length;

      if (lastWords <= OVERLAP_WORDS * 2) {
        // Last paragraph is small enough to use as overlap
        currentParagraphs = [lastParagraph];
        currentWordCount = lastWords;
      } else {
        // Take the last ~50 words of the last paragraph as overlap
        const words = lastParagraph.split(/\s+/);
        const overlapText = words.slice(-OVERLAP_WORDS).join(" ");
        currentParagraphs = [overlapText];
        currentWordCount = OVERLAP_WORDS;
      }
    }

    currentParagraphs.push(paragraph);
    currentWordCount += paragraphWords;
  }

  // Don't forget the last chunk
  if (currentParagraphs.length > 0) {
    chunks.push(currentParagraphs.join("\n\n"));
  }

  return chunks.filter((chunk) => !isLowQualityChunk(chunk));
}

/**
 * Returns true for chunks that aren't worth embedding:
 * - Too short to contain useful information
 * - Mostly bullet points (likely a table of contents or nav section)
 */
function isLowQualityChunk(chunk: string): boolean {
  if (chunk.length < 100) return true;

  const lines = chunk.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return true;

  // Count lines that look like bullet points or numbered list items
  const bulletLines = lines.filter((l) =>
    /^[\s]*[-•*►]\s/.test(l) || /^[\s]*\d+[.)]\s/.test(l)
  );

  return bulletLines.length / lines.length > 0.7;
}
