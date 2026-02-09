import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChat } from '../../context/ChatContext';

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
}

// Simple syntax highlighting keywords
const KEYWORDS: Record<string, string[]> = {
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined'],
  typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'interface', 'type', 'enum', 'implements', 'extends'],
  python: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'lambda', 'yield', 'async', 'await'],
  java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'final', 'void', 'int', 'String', 'boolean', 'if', 'else', 'for', 'while', 'return', 'new', 'try', 'catch', 'throw', 'throws', 'import', 'package'],
  c: ['int', 'char', 'void', 'float', 'double', 'if', 'else', 'for', 'while', 'return', 'struct', 'typedef', 'include', 'define', 'stdio', 'stdlib', 'string', 'const', 'static', 'unsigned', 'signed', 'switch', 'case', 'break', 'continue', 'do', 'default'],
};

function highlightCode(code: string, language: string, theme: 'dark' | 'light' = 'dark'): JSX.Element {
  const keywords = KEYWORDS[language] || KEYWORDS['javascript'] || [];

  // Define color scheme based on theme - optimized for contrast
  const colorScheme = {
    dark: {
      keyword: '#a78bfa',   // purple-400 - bright for dark bg
      string: '#34d399',    // emerald-400 - bright green
      comment: '#9ca3af',   // gray-400 - lighter gray
      number: '#fbbf24',    // amber-400 - bright yellow-orange
      normal: '#e5e7eb'     // gray-200 - light text
    },
    light: {
      keyword: '#7c3aed',   // purple-600 - dark for light bg
      string: '#059669',    // emerald-600 - dark green
      comment: '#6b7280',   // gray-500 - medium gray
      number: '#d97706',    // amber-600 - dark orange
      normal: '#1f2937'     // gray-800 - dark text
    }
  };

  const colors = colorScheme[theme];

  // Split code into tokens (simple approach)
  const tokens: Array<{ text: string; type: 'keyword' | 'string' | 'comment' | 'number' | 'normal' }> = [];
  const lines = code.split('\n');

  for (const line of lines) {
    let remaining = line;

    // Handle comments first
    const commentMatch = remaining.match(/(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/);
    if (commentMatch && commentMatch.index !== undefined) {
      const beforeComment = remaining.substring(0, commentMatch.index);
      if (beforeComment) {
        tokens.push(...parseLine(beforeComment, keywords));
      }
      if (commentMatch[1]) {
        tokens.push({ text: commentMatch[1], type: 'comment' });
      }
      remaining = remaining.substring(commentMatch.index + (commentMatch[0]?.length || 0));
    } else {
      tokens.push(...parseLine(remaining, keywords));
      remaining = '';
    }

    // Add newline
    tokens.push({ text: '\n', type: 'normal' });
  }

  return (
    <>
      {tokens.map((token, index) => {
        let style = {};
        if (token.type === 'keyword') {
          style = { color: colors.keyword };
        } else if (token.type === 'string') {
          style = { color: colors.string };
        } else if (token.type === 'comment') {
          style = { color: colors.comment };
        } else if (token.type === 'number') {
          style = { color: colors.number };
        } else {
          style = { color: colors.normal };
        }
        
        return <span key={index} style={style}>{token.text}</span>;
      })}
    </>
  );
}

function parseLine(line: string, keywords: string[]): Array<{ text: string; type: 'keyword' | 'string' | 'comment' | 'number' | 'normal' }> {
  const tokens: Array<{ text: string; type: 'keyword' | 'string' | 'comment' | 'number' | 'normal' }> = [];
  let remaining = line;

  // Simple tokenization
  while (remaining.length > 0) {
    // Strings
    const stringMatch = remaining.match(/^(["'`])(?:(?!\1)[^\\]|\\.)*\1/);
    if (stringMatch) {
      tokens.push({ text: stringMatch[0], type: 'string' });
      remaining = remaining.substring(stringMatch[0].length);
      continue;
    }

    // Numbers
    const numberMatch = remaining.match(/^\d+\.?\d*/);
    if (numberMatch) {
      tokens.push({ text: numberMatch[0], type: 'number' });
      remaining = remaining.substring(numberMatch[0].length);
      continue;
    }

    // Keywords
    let foundKeyword = false;
    for (const keyword of keywords) {
      if (remaining.startsWith(keyword) && !/\w/.test(remaining[keyword.length] || '')) {
        tokens.push({ text: keyword, type: 'keyword' });
        remaining = remaining.substring(keyword.length);
        foundKeyword = true;
        break;
      }
    }
    if (foundKeyword) continue;

    // Regular characters
    if (remaining.length > 0) {
      const char = remaining[0];
      if (char !== undefined) {
        tokens.push({ text: char, type: 'normal' });
      }
      remaining = remaining.substring(1);
    } else {
      break;
    }
  }

  return tokens;
}

/**
 * Detect programming language from code content
 * Used when language class is not provided
 */
function detectLanguage(code: string): string {
  const lines = code.split('\n').slice(0, 5); // Check first 5 lines
  const content = lines.join('\n').toLowerCase();

  // C/C++ patterns
  if (/#include|int main|printf|void|char\*|uint32|struct\s+\w+|typedef|stdio\.h|stdlib\.h/.test(content)) {
    return 'c';
  }
  
  // Python patterns
  if (/^import |^from |def |:\s*$|elif |except |class .*:|@|lambda|yield/.test(content)) {
    return 'python';
  }

  // JavaScript/TypeScript patterns
  if (/const |let |var |function |=>|async |await |import \{|export |class \w+|interface /.test(content)) {
    return /interface |type \w+|as --|: \w+/.test(content) ? 'typescript' : 'javascript';
  }

  // Java patterns
  if (/public class |private |static |void |new |import java|@Override|throw new|catch \(/.test(content)) {
    return 'java';
  }

  // HTML/XML patterns
  if (/<html|<body|<div|<!DOCTYPE|<head>/.test(content)) {
    return 'html';
  }

  // CSS patterns
  if (/\{\s*color:|\.[\w-]+\s*\{|@media|@keyframes|background:|border:/.test(content)) {
    return 'css';
  }

  // SQL patterns
  if (/SELECT |FROM |WHERE |INSERT INTO|UPDATE |DELETE |CREATE TABLE|DROP/.test(content)) {
    return 'sql';
  }

  // JSON patterns
  if (/^\s*[{[]|":\s*["\d\[\{]/.test(content)) {
    return 'json';
  }

  // Bash/Shell patterns
  if (/^#!\/bin|^\$\s|&&|\s\.sh|curl|grep|sed|awk/.test(content)) {
    return 'bash';
  }

  return 'plaintext';
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlighted = highlightCode(code, language, theme);

  // Theme colors with inline styles for reliability
  const themes = {
    dark: {
      containerBg: '#121226',
      headerBg: '#0e0e22',
      codeBg: '#121226',
      borderColor: '#374151',
      textColor: '#e5e7eb',
      labelColor: '#9ca3af'
    },
    light: {
      containerBg: '#ffffff',
      headerBg: '#f3f4f6',
      codeBg: '#f9fafb',
      borderColor: '#e5e7eb',
      textColor: '#1f2937',
      labelColor: '#6b7280'
    }
  };

  const currentTheme = themes[theme];

  // Code blocks always use dark theme, independent of app theme
  return (
    <div className="relative group rounded-lg my-3 max-w-full border" style={{ borderColor: currentTheme.borderColor }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b" style={{ backgroundColor: currentTheme.headerBg, borderColor: currentTheme.borderColor }}>
        <span className="text-xs font-mono uppercase" style={{ color: currentTheme.labelColor }}>{language || 'code'}</span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`flex items-center gap-1 px-2 py-1.5 sm:px-2 sm:py-1 rounded text-xs font-medium transition-colors touch-manipulation ${
              theme === 'dark'
                ? 'text-yellow-400 hover:bg-yellow-400/10'
                : 'text-blue-600 hover:bg-blue-600/10'
            }`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Wrap Toggle Button */}
          <button
            onClick={() => setIsWrapped(!isWrapped)}
            className={`flex items-center px-2 py-1.5 sm:px-2 sm:py-1 rounded text-xs font-medium transition-colors touch-manipulation ${
              isWrapped
                ? 'text-blue-400 hover:bg-blue-400/10'
                : 'text-gray-400 hover:bg-white/10'
            }`}
            title={isWrapped ? 'Disable wrap' : 'Enable wrap'}
          >
            {isWrapped ? '↔️' : '⤴️'}
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-2 sm:py-1 rounded text-xs font-medium transition-colors touch-manipulation ${
              copied
                ? 'text-green-400 bg-green-400/10'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      {/* Code */}
      <div className={isWrapped ? "overflow-hidden" : "overflow-x-auto overflow-y-hidden"} style={{ backgroundColor: currentTheme.codeBg }}>
        <pre className={`p-3 sm:p-4 m-0 ${isWrapped ? "whitespace-pre-wrap break-words overflow-hidden" : "whitespace-pre overflow-x-auto"}`} style={{ backgroundColor: currentTheme.codeBg }}>
          <code className="text-sm sm:text-base font-mono" style={{ color: currentTheme.textColor }}>
            {highlighted}
          </code>
        </pre>
      </div>
    </div>
  );
}

export default function MessageContent({ content, isStreaming }: MessageContentProps) {
  const { state } = useChat();
  const isDark = state.theme === 'dark';

  return (
    <div className={`prose ${isDark ? 'prose-invert' : ''} prose-sm max-w-none overflow-hidden`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const codeString = String(children).replace(/\n$/, '');
            
            // Check if this is a code block (has language class or multiline)
            // Fenced code blocks have "language-xxx" class
            // OR if content has newlines, it's likely a block
            const hasLanguageClass = className && className.startsWith('language-');
            const isMultiline = codeString.includes('\n');
            
            if (hasLanguageClass || isMultiline) {
              // Extract language from className or detect from code content
              let language = 'plaintext';
              if (hasLanguageClass) {
                const match = /language-(\w+)/.exec(className || '');  
                language = match?.[1] || 'plaintext';
              } else {
                // Auto-detect language from code content
                language = detectLanguage(codeString);
              }
              return <CodeBlock language={language} code={codeString} />
            }
            
            // Inline code (single line, no language class)
            return (
              <code 
                className={`px-1.5 py-0.5 rounded font-mono text-sm sm:text-base ${
                  isDark 
                    ? 'bg-dark-100 text-theme-primary' 
                    : 'bg-gray-100 text-theme-primary'
                }`} 
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            // Just pass through, CodeBlock handles the wrapper
            return <>{children}</>;
          },
          p({ children }) {
            return <p className={`mb-2 last:mb-0 text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{children}</p>;
          },
          ul({ children }) {
            return <ul className={`list-disc list-inside mb-2 text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{children}</ul>;
          },
          ol({ children }) {
            return <ol className={`list-decimal list-inside mb-2 text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{children}</ol>;
          },
          li({ children }) {
            return <li className="mb-1 text-sm sm:text-base">{children}</li>;
          },
          h1({ children }) {
            return <h1 className={`text-lg sm:text-xl font-bold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{children}</h1>;
          },
          h2({ children }) {
            return <h2 className={`text-base sm:text-lg font-bold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{children}</h2>;
          },
          h3({ children }) {
            return <h3 className={`text-sm sm:text-base font-bold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className={`border-l-4 border-theme-primary pl-3 sm:pl-4 italic my-2 text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-theme-primary hover:text-theme-primary-hover underline"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 max-w-full">
                <table className={`min-w-full divide-y text-sm sm:text-base ${isDark ? 'divide-dark-300' : 'divide-gray-200'}`}>
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className={`px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-medium uppercase tracking-wider ${isDark ? 'bg-dark-300 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className={`px-2 sm:px-3 py-2 text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {children}
              </td>
            );
          },
        }}
      >
        {content || ''}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-theme-primary animate-pulse" />
      )}
    </div>
  );
}
