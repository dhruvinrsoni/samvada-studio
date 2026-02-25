import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChat } from '../../context/ChatContext';

// Function to detect and wrap code blocks in markdown
function preprocessContent(content: string): string {
  if (!content) return content;

  // Split content into paragraphs/lines
  const paragraphs = content.split('\n\n');
  const processedParagraphs: string[] = [];

  for (const paragraph of paragraphs) {
    // Skip if already contains code blocks
    if (paragraph.includes('```')) {
      processedParagraphs.push(paragraph);
      continue;
    }

    const lines = paragraph.split('\n');
    let processedLines: string[] = [];
    let codeBlock: string[] = [];
    let inCodeBlock = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check if this line looks like code
      const looksLikeCode = (
        // HTML/XML tags
        /<\/?[a-zA-Z][^>]*>/.test(trimmed) ||
        // Programming keywords
        /\b(function|const|let|var|def|class|import|export|if|for|while|return)\b/.test(trimmed) ||
        // JSON-like structures
        /^\s*[{[]/.test(trimmed) ||
        // CSS selectors or properties
        /^\s*\.[a-zA-Z-]|\s*#[a-zA-Z-]|\s*[a-zA-Z-]+:\s*[^;]+;/.test(trimmed) ||
        // Indented code (4+ spaces or tab)
        line.startsWith('    ') || line.startsWith('\t') ||
        // Lines that are part of a code block (continuation)
        (inCodeBlock && (trimmed === '' || trimmed.length > 0))
      );

      if (looksLikeCode && !inCodeBlock) {
        // Start collecting code lines
        inCodeBlock = true;
        codeBlock = [line];
      } else if (inCodeBlock) {
        if (looksLikeCode || trimmed === '') {
          // Continue collecting
          codeBlock.push(line);
        } else {
          // End code block and process it
          if (codeBlock.length > 0) {
            const codeContent = codeBlock.join('\n');
            let language = '';

            // Detect language
            if (/<html|<body|<head|<div|<span|<p\s/.test(codeContent)) {
              language = 'html';
            } else if (/import\s+.*from|export\s|const\s|let\s|function\s/.test(codeContent)) {
              language = 'javascript';
            } else if (/def\s|class\s|import\s|from\s/.test(codeContent)) {
              language = 'python';
            } else if (/public\s|private\s|class\s|void\s|int\s/.test(codeContent)) {
              language = 'java';
            }

            processedLines.push('```' + language);
            processedLines.push(...codeBlock);
            processedLines.push('```');
          }
          inCodeBlock = false;
          codeBlock = [];
          processedLines.push(line);
        }
      } else {
        processedLines.push(line);
      }
    }

    // Handle any remaining code block
    if (inCodeBlock && codeBlock.length > 0) {
      const codeContent = codeBlock.join('\n');
      let language = '';

      // Detect language
      if (/<html|<body|<head|<div|<span|<p\s/.test(codeContent)) {
        language = 'html';
      } else if (/import\s+.*from|export\s|const\s|let\s|function\s/.test(codeContent)) {
        language = 'javascript';
      } else if (/def\s|class\s|import\s|from\s/.test(codeContent)) {
        language = 'python';
      } else if (/public\s|private\s|class\s|void\s|int\s/.test(codeContent)) {
        language = 'java';
      }

      processedLines.push('```' + language);
      processedLines.push(...codeBlock);
      processedLines.push('```');
    }

    processedParagraphs.push(processedLines.join('\n'));
  }

  return processedParagraphs.join('\n\n');
}

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
};

function highlightCode(code: string, language: string): string {
  const keywords = KEYWORDS[language] || KEYWORDS.javascript;
  let highlighted = code
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Highlight strings
  highlighted = highlighted.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="text-green-400">$&</span>');
  
  // Highlight comments
  highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="text-gray-500">$1</span>');
  highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-gray-500">$1</span>');
  highlighted = highlighted.replace(/(#.*$)/gm, '<span class="text-gray-500">$1</span>');
  
  // Highlight keywords
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
    highlighted = highlighted.replace(regex, '<span class="text-purple-400">$1</span>');
  });
  
  // Highlight numbers
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-orange-400">$1</span>');
  
  return highlighted;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const { state } = useChat();
  const isDark = state.theme === 'dark';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlighted = highlightCode(code, language);

  return (
    <div className={`relative group rounded-lg overflow-hidden my-3 max-w-full ${isDark ? 'bg-dark-100' : 'bg-gray-800'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'bg-dark-200 border-dark-300' : 'bg-gray-700 border-gray-600'}`}>
        <span className="text-xs font-mono text-gray-400 uppercase">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
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
      {/* Code */}
      <div className="overflow-x-auto">
        <pre className="p-4 min-w-0">
          <code 
            className="text-sm font-mono text-gray-300 block whitespace-pre"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
}

export default function MessageContent({ content, isStreaming }: MessageContentProps) {
  const { state } = useChat();
  const isDark = state.theme === 'dark';

  // Preprocess content to detect and wrap code blocks
  const processedContent = preprocessContent(content);

  return (
    <div className={`prose ${isDark ? 'prose-invert' : ''} prose-sm max-w-none overflow-hidden`}>
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            
            if (match) {
              return <CodeBlock language={match[1]} code={codeString} />;
            }
            
            // Inline code
            return (
              <code 
                className={`px-1.5 py-0.5 rounded font-mono text-sm ${
                  isDark 
                    ? 'bg-dark-100 text-primary-400' 
                    : 'bg-gray-100 text-primary-600'
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
            return <p className={`mb-2 last:mb-0 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{children}</p>;
          },
          ul({ children }) {
            return <ul className={`list-disc list-inside mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{children}</ul>;
          },
          ol({ children }) {
            return <ol className={`list-decimal list-inside mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{children}</ol>;
          },
          li({ children }) {
            return <li className="mb-1">{children}</li>;
          },
          h1({ children }) {
            return <h1 className={`text-xl font-bold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{children}</h1>;
          },
          h2({ children }) {
            return <h2 className={`text-lg font-bold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{children}</h2>;
          },
          h3({ children }) {
            return <h3 className={`text-base font-bold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className={`border-l-4 border-primary-500 pl-4 italic my-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
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
                className="text-primary-500 hover:text-primary-400 underline"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 max-w-full">
                <table className={`min-w-full divide-y ${isDark ? 'divide-dark-300' : 'divide-gray-200'}`}>
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'bg-dark-300 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className={`px-3 py-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {children}
              </td>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-primary-500 animate-pulse" />
      )}
    </div>
  );
}
