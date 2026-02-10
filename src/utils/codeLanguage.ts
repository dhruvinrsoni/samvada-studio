// Lightweight language detection and C/C++ tokenizer
// Implemented in-project so it can be improved later without external deps

type Token = { text: string; type: 'keyword' | 'string' | 'comment' | 'number' | 'normal' };

const C_KEYWORDS = [
  'int','char','void','float','double','if','else','for','while','return','struct','typedef','include','define','const','static','unsigned','signed','switch','case','break','continue','do','default'
];

const CPP_KEYWORDS = C_KEYWORDS.concat([
  'class','namespace','template','typename','std','cout','cin','nullptr','operator','using','auto','constexpr','delete','new','this','public','private','protected'
]);

export function detectLanguage(code: string): string {
  const lines = code.split('\n').slice(0, 8);
  const content = lines.join('\n');
  const lower = content.toLowerCase();

  // C++ patterns
  const cppPatterns = [
    /#include\s*<.*iostream.*>/i,
    /\bstd::\w+/,
    /\busing\s+namespace\s+std\b/i,
    /\bcout\b|\bcin\b|\bcout\s*<</,
    /^\s*template\s*<.*>/m,
    /\bnullptr\b/,
    /\bclass\s+\w+/,
    /\bstd::vector\b|\bstd::string\b/
  ];
  if (cppPatterns.some((r) => r.test(content))) return 'cpp';

  // C patterns
  const cPatterns = [
    /#include\s*<.*stdio\.h.*>/i,
    /#include\s*<.*stdlib\.h.*>/i,
    /\bprintf\s*\(/,
    /\bscanf\s*\(/,
    /\bmalloc\s*\(|\bfree\s*\(/,
    /\bsizeof\s*\(/
  ];
  if (cPatterns.some((r) => r.test(content))) return 'c';

  // Fallbacks used by caller in main app
  // Python: also detect `for <x> in ` and `print(` patterns
  if (/^\s*(import |from )|\bdef\s+\w+\(|\bclass\s+\w+:|\basync\b|\bawait\b|\bfor\s+\w+\s+in\b|\bprint\s*\(/.test(lower)) return 'python';
  if (/\b(console\.log|function\s*\(|=>|\bconst\s+|\blet\s+|\bvar\s+)/.test(lower)) return 'javascript';
  // Java patterns (case-insensitive and common, including System.out.print/println and common collections)
  const javaPatterns = [
    /\bpublic\s+class\b/i,
    /\bpackage\b/i,
    /\bimport\s+java\b/i,
    /system\.out\.(println|print)\b/i,
    /\bnew\s+ArrayList\b|\bnew\s+HashMap\b|\bList<|\bMap</i,
    /\bimplements\b|\bextends\b|@Override\b/i,
    /\bSystem\.err\b/i
  ];
  if (javaPatterns.some((r) => r.test(content))) return 'java';
  if (/\<\/?(html|body|div|head|span|script|style)\b|<!doctype>/i.test(content)) return 'html';
  if (/\{\s*[^}]*:\s*[^}]+;|@media|@keyframes|\.[\w-]+\s*\{/.test(content)) return 'css';
  if (/\bselect\b|\bfrom\b|\bwhere\b|\binsert\b|\bupdate\b|\bdelete\b|\bcreate\b/i.test(lower)) return 'sql';
  if (/^\s*[{[]/.test(content) && /:\s*"?\w+"?/.test(content)) return 'json';
  if (/^#!\/|\bgrep\b|\bsed\b|\bawk\b|\bcurl\b|^\$\s/m.test(content)) return 'bash';

  // Return empty string when unknown so UI can show generic 'code' label instead of 'plaintext'
  return '';
}

// Simple tokenizer for C/C++ style languages. Returns array of tokens preserving newlines.
export function tokenizeCStyle(code: string, language: 'c' | 'cpp' = 'c'): Token[] {
  const keywords = language === 'cpp' ? CPP_KEYWORDS : C_KEYWORDS;
  const tokens: Token[] = [];
  const lines: string[] = code.split('\n');

  for (let li = 0; li < lines.length; li++) {
    let line: string = lines[li] || '';
    let i = 0;

    while (i < line.length) {
      const rest = line.slice(i);

      // Line comment
      if (rest.startsWith('//')) {
        tokens.push({ text: line.slice(i), type: 'comment' });
        i = line.length;
        break;
      }

      // Block comment start
      if (rest.startsWith('/*')) {
        const end = line.indexOf('*/', i + 2);
        if (end !== -1) {
          tokens.push({ text: line.slice(i, end + 2), type: 'comment' });
          i = end + 2;
          continue;
        } else {
          tokens.push({ text: line.slice(i), type: 'comment' });
          i = line.length;
          break;
        }
      }

      // Strings (", '\') and char literals
      const strMatch = rest.match(/^(["'])(?:\\.|(?!\1).)*\1/);
      if (strMatch) {
        tokens.push({ text: strMatch[0], type: 'string' });
        i += strMatch[0].length;
        continue;
      }

      // Numbers
      const numMatch = rest.match(/^\b\d+(?:\.\d+)?\b/);
      if (numMatch) {
        tokens.push({ text: numMatch[0], type: 'number' });
        i += numMatch[0].length;
        continue;
      }

      // Identifiers (including C++ scope operator)
      const idMatch = rest.match(/^[_A-Za-z]\w*(::[_A-Za-z]\w*)*/);
      if (idMatch) {
        const id = idMatch[0];
        if (keywords.includes(id) || keywords.includes(id.replace(/::.*$/, ''))) {
          tokens.push({ text: id, type: 'keyword' });
        } else {
          tokens.push({ text: id, type: 'normal' });
        }
        i += id.length;
        continue;
      }

      // Anything else (operators, punctuation)
      tokens.push({ text: line.charAt(i), type: 'normal' });
      i += 1;
    }

    // Add newline token except after last line
    if (li < lines.length - 1) tokens.push({ text: '\n', type: 'normal' });
  }

  return tokens;
}
