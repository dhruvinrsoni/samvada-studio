import html2canvas from 'html2canvas';

const MAX_CANVAS_HEIGHT = 16384;
const SAFARI_MAX_HEIGHT = 8192;

function getMaxHeight(): number {
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  return isSafari ? SAFARI_MAX_HEIGHT : MAX_CANVAS_HEIGHT;
}

export async function captureViewport(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    useCORS: true,
    allowTaint: true,
    scale: window.devicePixelRatio || 2,
    backgroundColor: null,
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas to Blob failed'))),
      'image/png',
    );
  });
}

export async function captureFull(element: HTMLElement): Promise<Blob> {
  const maxH = getMaxHeight();
  const originalOverflow = element.style.overflow;
  const originalHeight = element.style.height;
  const originalMaxHeight = element.style.maxHeight;
  const scrollTop = element.scrollTop;

  const fullHeight = element.scrollHeight;
  const cappedHeight = Math.min(fullHeight, maxH);
  const isTruncated = fullHeight > maxH;

  try {
    element.style.overflow = 'visible';
    element.style.height = `${cappedHeight}px`;
    element.style.maxHeight = 'none';
    element.scrollTop = 0;

    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: true,
      scale: window.devicePixelRatio || 2,
      height: cappedHeight,
      windowHeight: cappedHeight,
      backgroundColor: null,
    });

    if (isTruncated) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const bannerH = 32 * (window.devicePixelRatio || 2);
        const y = canvas.height - bannerH;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, y, canvas.width, bannerH);
        ctx.fillStyle = '#ffffff';
        ctx.font = `${14 * (window.devicePixelRatio || 2)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(
          `Content truncated (${fullHeight}px total, captured ${cappedHeight}px)`,
          canvas.width / 2,
          y + bannerH * 0.65,
        );
      }
    }

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas to Blob failed'))),
        'image/png',
      );
    });
  } finally {
    element.style.overflow = originalOverflow;
    element.style.height = originalHeight;
    element.style.maxHeight = originalMaxHeight;
    element.scrollTop = scrollTop;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export function generateFilename(chatTitle?: string): string {
  const sanitized = (chatTitle || 'chat')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${sanitized}-${ts}.png`;
}
