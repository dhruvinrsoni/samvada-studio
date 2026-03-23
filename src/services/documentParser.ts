export interface ParsedDocument {
  text: string;
  metadata: {
    fileName: string;
    fileType: string;
    pageCount?: number;
  };
}

/**
 * Strip markdown syntax that pollutes embeddings:
 * badges, inline images, raw URLs, HTML tags, reference-style links.
 * Keeps the human-readable link text so prose meaning is preserved.
 */
export function cleanMarkdownForEmbedding(raw: string): string {
  let text = raw;

  // Badge images: [![alt](img)](url) → alt
  text = text.replace(/\[!\[([^\]]*)\]\([^)]*\)\]\([^)]*\)/g, '$1');

  // Inline images: ![alt](url) → alt
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');

  // Inline links: [text](url) → text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  // Reference-style links: [text][ref] → text
  text = text.replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1');

  // Reference definitions: [ref]: url "title"
  text = text.replace(/^\[[^\]]+\]:\s+.*$/gm, '');

  // Bare URLs: http(s)://... → remove
  text = text.replace(/https?:\/\/[^\s)>\]]+/g, '');

  // HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Collapse excessive blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

export async function parseDocument(file: File): Promise<ParsedDocument> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const meta = { fileName: file.name, fileType: ext };

  switch (ext) {
    case 'txt':
    case 'md':
    case 'markdown':
    case 'log':
    case 'json':
    case 'xml':
    case 'yaml':
    case 'yml':
    case 'toml':
    case 'ini':
    case 'cfg':
    case 'conf':
    case 'env':
    case 'sh':
    case 'bat':
    case 'ps1':
    case 'py':
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'scss':
    case 'less':
    case 'sql':
    case 'r':
    case 'java':
    case 'c':
    case 'cpp':
    case 'h':
    case 'hpp':
    case 'cs':
    case 'go':
    case 'rs':
    case 'rb':
    case 'php':
    case 'swift':
    case 'kt':
    case 'scala':
      return { text: await file.text(), metadata: meta };

    case 'pdf':
      return parsePDF(file, meta);

    case 'docx':
      return parseDOCX(file, meta);

    case 'csv':
      return parseCSV(file, meta);

    default:
      return { text: await file.text(), metadata: meta };
  }
}

async function parsePDF(
  file: File,
  metadata: ParsedDocument['metadata'],
): Promise<ParsedDocument> {
  const pdfjsLib = await import('pdfjs-dist');

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join(' ');
    pages.push(text);
  }

  return {
    text: pages.join('\n\n'),
    metadata: { ...metadata, pageCount: pdf.numPages },
  };
}

async function parseDOCX(
  file: File,
  metadata: ParsedDocument['metadata'],
): Promise<ParsedDocument> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;
  const plainText = html
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { text: plainText, metadata };
}

async function parseCSV(
  file: File,
  metadata: ParsedDocument['metadata'],
): Promise<ParsedDocument> {
  const Papa = await import('papaparse');
  const text = await file.text();

  return new Promise((resolve, reject) => {
    Papa.default.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields ?? [];
        const rows = results.data as Record<string, unknown>[];

        const lines = rows.map((row) =>
          headers.map((h) => `${h}: ${row[h] ?? ''}`).join(', '),
        );

        resolve({
          text: `Columns: ${headers.join(', ')}\n\n${lines.join('\n')}`,
          metadata,
        });
      },
      error(err: Error) {
        reject(err);
      },
    });
  });
}

export function getSupportedExtensions(): string[] {
  return ['txt', 'md', 'pdf', 'docx', 'csv', 'json', 'xml', 'yaml', 'yml', 'html', 'py', 'js', 'ts'];
}

export function getAcceptString(): string {
  return '.txt,.md,.markdown,.pdf,.docx,.csv,.json,.xml,.yaml,.yml,.toml,.html,.py,.js,.ts,.tsx,.jsx,.log,.sql,.sh,.bat,.ps1,.java,.c,.cpp,.h,.go,.rs,.rb,.php,.swift,.kt,.scala,.r,.cs,.ini,.cfg,.conf,.env,.scss,.less,.css,.hpp';
}
