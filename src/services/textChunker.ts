export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
}

export interface TextChunk {
  text: string;
  index: number;
  metadata: {
    heading?: string;
    startOffset: number;
  };
}

const HEADING_RE = /^(#{1,6})\s+(.+)$/;

export function chunkText(
  text: string,
  options: ChunkOptions,
  isMarkdown = false,
): TextChunk[] {
  if (!text.trim()) return [];

  if (isMarkdown) {
    return chunkMarkdown(text, options);
  }
  return chunkPlain(text, options);
}

function chunkMarkdown(text: string, opts: ChunkOptions): TextChunk[] {
  const sections = splitByHeadings(text);
  const chunks: TextChunk[] = [];
  let idx = 0;

  for (const section of sections) {
    const subChunks = splitBySizeWithOverlap(section.text, opts);
    for (const sub of subChunks) {
      chunks.push({
        text: section.heading ? `${section.heading}\n\n${sub.text}` : sub.text,
        index: idx++,
        metadata: {
          heading: section.heading,
          startOffset: section.startOffset + sub.offset,
        },
      });
    }
  }

  return chunks;
}

function chunkPlain(text: string, opts: ChunkOptions): TextChunk[] {
  const subs = splitBySizeWithOverlap(text, opts);
  return subs.map((sub, idx) => ({
    text: sub.text,
    index: idx,
    metadata: { startOffset: sub.offset },
  }));
}

interface Section {
  heading?: string;
  text: string;
  startOffset: number;
}

function splitByHeadings(text: string): Section[] {
  const lines = text.split('\n');
  const sections: Section[] = [];
  let currentHeading: string | undefined;
  let currentLines: string[] = [];
  let sectionStart = 0;
  let offset = 0;

  for (const line of lines) {
    const match = line.match(HEADING_RE);
    if (match) {
      if (currentLines.length > 0) {
        const body = currentLines.join('\n').trim();
        if (body) {
          sections.push({
            heading: currentHeading,
            text: body,
            startOffset: sectionStart,
          });
        }
      }
      currentHeading = line;
      currentLines = [];
      sectionStart = offset;
    } else {
      currentLines.push(line);
    }
    offset += line.length + 1;
  }

  if (currentLines.length > 0) {
    const body = currentLines.join('\n').trim();
    if (body) {
      sections.push({
        heading: currentHeading,
        text: body,
        startOffset: sectionStart,
      });
    }
  }

  if (sections.length === 0 && text.trim()) {
    sections.push({ text: text.trim(), startOffset: 0 });
  }

  return sections;
}

interface SubChunk {
  text: string;
  offset: number;
}

function splitBySizeWithOverlap(text: string, opts: ChunkOptions): SubChunk[] {
  const { chunkSize, chunkOverlap } = opts;

  if (text.length <= chunkSize) {
    return [{ text, offset: 0 }];
  }

  const results: SubChunk[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    if (end < text.length) {
      end = findBreakPoint(text, start, end);
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) {
      results.push({ text: chunk, offset: start });
    }

    if (end >= text.length) break;

    const step = end - start - chunkOverlap;
    start += Math.max(step, 1);
  }

  return results;
}

function findBreakPoint(text: string, start: number, end: number): number {
  const window = text.slice(start, end);

  const paraBreak = window.lastIndexOf('\n\n');
  if (paraBreak > window.length * 0.3) return start + paraBreak;

  const sentenceEnd = Math.max(
    window.lastIndexOf('. '),
    window.lastIndexOf('! '),
    window.lastIndexOf('? '),
  );
  if (sentenceEnd > window.length * 0.3) return start + sentenceEnd + 2;

  const lineBreak = window.lastIndexOf('\n');
  if (lineBreak > window.length * 0.3) return start + lineBreak;

  const spaceBreak = window.lastIndexOf(' ');
  if (spaceBreak > window.length * 0.3) return start + spaceBreak;

  return end;
}
