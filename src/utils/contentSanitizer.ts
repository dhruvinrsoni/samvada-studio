/**
 * Content Sanitizer - Future-proof content validation and cleaning
 * 
 * This module ensures ALL message content is safe, clean plain text.
 * Sanitization happens at the entry point (when receiving LLM responses)
 * and at the exit point (when loading from storage).
 */

/**
 * Sanitizes LLM response content to ensure it's clean plain text
 * This is the PRIMARY sanitization point - called when receiving LLM responses
 */
export function sanitizeLLMResponse(content: unknown): string {
  // Handle non-string inputs
  if (content === null || content === undefined) {
    return '';
  }

  if (typeof content !== 'string') {
    console.warn('Invalid LLM response type:', typeof content, content);
    return String(content);
  }

  let cleaned = content;

  // 1. Remove any HTML tags that might have leaked through
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // 2. Remove malformed HTML/CSS attributes that sometimes appear
  // Patterns like: 400">class="text-green-400">
  cleaned = cleaned.replace(/\d+">class="[^"]*">/g, '');
  cleaned = cleaned.replace(/class="[^"]*">/g, '');
  cleaned = cleaned.replace(/\b\d+">/g, '');

  // 3. Remove other common corrupted patterns
  cleaned = cleaned.replace(/style="[^"]*">/g, '');
  cleaned = cleaned.replace(/id="[^"]*">/g, '');

  // 4. Normalize whitespace (but preserve intentional line breaks)
  cleaned = cleaned.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines

  // 5. Trim leading/trailing whitespace from each line
  cleaned = cleaned
    .split('\n')
    .map(line => line.trim())
    .join('\n');

  // 6. Final trim
  cleaned = cleaned.trim();

  // 7. Validate max length (prevent DOS attacks with massive responses)
  const MAX_CONTENT_LENGTH = 1000000; // 1MB of text
  if (cleaned.length > MAX_CONTENT_LENGTH) {
    console.warn('Content exceeds max length, truncating:', cleaned.length);
    cleaned = cleaned.substring(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated due to length]';
  }

  return cleaned;
}

/**
 * Validates message content from storage
 * This is a SECONDARY check - ensures loaded data is still valid
 */
export function validateStoredContent(content: unknown): string {
  if (typeof content !== 'string') {
    console.error('Invalid stored content type:', typeof content);
    return '[Corrupted content]';
  }

  // Check for null bytes or other problematic characters
  if (content.includes('\0')) {
    console.warn('Content contains null bytes, cleaning');
    return content.replace(/\0/g, '');
  }

  // If content looks suspiciously like it has HTML/CSS mixed in, sanitize it
  const hasHtmlPattern = /\d+">class=|style="|id="/i.test(content);
  if (hasHtmlPattern) {
    console.warn('Stored content has HTML patterns, sanitizing');
    return sanitizeLLMResponse(content);
  }

  return content;
}

/**
 * Sanitizes user input (prompts)
 * Lighter sanitization since user input should be preserved as-is
 */
export function sanitizeUserInput(content: string): string {
  if (typeof content !== 'string') {
    return '';
  }

  // Just trim and normalize line breaks
  let cleaned = content.trim();
  cleaned = cleaned.replace(/\r\n/g, '\n'); // Normalize Windows line endings
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n'); // Max 3 consecutive newlines

  return cleaned;
}

/**
 * Safe content display for previews/excerpts
 * Removes markdown formatting for plain text display
 */
export function toPlainTextPreview(content: string, maxLength: number = 200): string {
  let plain = content;

  // Remove markdown code blocks
  plain = plain.replace(/```[\s\S]*?```/g, '[code]');
  plain = plain.replace(/`[^`]+`/g, '[code]');

  // Remove markdown headers
  plain = plain.replace(/^#{1,6}\s+/gm, '');

  // Remove markdown links
  plain = plain.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove markdown emphasis
  plain = plain.replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1');

  // Remove markdown lists
  plain = plain.replace(/^[\s]*[-*+]\s+/gm, '');
  plain = plain.replace(/^[\s]*\d+\.\s+/gm, '');

  // Normalize whitespace
  plain = plain.replace(/\s+/g, ' ').trim();

  // Truncate if needed
  if (plain.length > maxLength) {
    return plain.substring(0, maxLength).trim() + '...';
  }

  return plain;
}

/**
 * Emergency content recovery - tries to extract readable text from corrupted content
 */
export function recoverCorruptedContent(content: string): string {
  console.warn('Attempting to recover corrupted content');

  // Try to extract text between corrupted patterns
  const parts: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Skip lines that are mostly corrupted patterns
    if (line.match(/(\d+">|class="|style="){3,}/)) {
      continue;
    }

    // Clean the line
    let cleaned = line.replace(/\d+">class="[^"]*">/g, '');
    cleaned = cleaned.replace(/class="[^"]*">/g, '');
    cleaned = cleaned.replace(/\b\d+">/g, '');
    cleaned = cleaned.trim();

    if (cleaned.length > 0) {
      parts.push(cleaned);
    }
  }

  return parts.join('\n');
}
