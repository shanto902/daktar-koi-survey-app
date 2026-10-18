/**
 * Utility functions for cleaning, merging, and appending OCR text lines.
 * Specifically designed for multi-line doctor qualifications, addresses, and notes.
 */

/**
 * Cleans leading OCR bullets/symbols and trailing punctuation.
 */
export function cleanOcrLine(line: string): string {
  if (!line) return '';
  return line
    .replace(/^[\s•\-\*~|►▪▫›»\d+.)]+/, '') // Remove leading bullets, numbers, dashes
    .trim()
    .replace(/[,;]+$/, '') // Remove trailing commas or semicolons
    .trim();
}

/**
 * Merges multiple OCR lines into a single coherent text block.
 *
 * @param allLines Array of all raw OCR lines
 * @param selectedIndices Zero-based line indices to merge (will be sorted in ascending order)
 * @param delimiter Delimiter string (default: ', ' for qualifications, '\n' for addresses)
 */
export function mergeOcrLines(
  allLines: string[],
  selectedIndices: number[],
  delimiter: string = ', '
): string {
  if (!allLines || selectedIndices.length === 0) return '';

  const sortedIndices = [...selectedIndices].sort((a, b) => a - b);
  const cleanedParts: string[] = [];

  for (const idx of sortedIndices) {
    if (idx >= 0 && idx < allLines.length) {
      const cleaned = cleanOcrLine(allLines[idx]);
      if (cleaned.length > 0) {
        cleanedParts.push(cleaned);
      }
    }
  }

  return cleanedParts.join(delimiter);
}

/**
 * Appends a new piece of text to an existing field value, preventing double delimiters.
 *
 * @param existing Current field text
 * @param addition New text to append
 * @param delimiter Delimiter to place between existing and new text (default: ', ')
 */
export function appendOcrText(
  existing: string,
  addition: string,
  delimiter: string = ', '
): string {
  const cleanExisting = (existing || '').trim();
  const cleanAddition = cleanOcrLine(addition);

  if (!cleanExisting) return cleanAddition;
  if (!cleanAddition) return cleanExisting;

  // Remove trailing delimiter/comma from existing if delimiter starts with comma
  let base = cleanExisting;
  if (delimiter.trim() === ',' || delimiter.trim() === ', ') {
    base = base.replace(/[,;]+$/, '').trim();
  } else if (delimiter === '\n') {
    base = base.replace(/\n+$/, '').trim();
  }

  return `${base}${delimiter}${cleanAddition}`;
}

