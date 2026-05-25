import DOMPurify from 'dompurify';

/**
 * Extrai apenas o texto puro de uma string HTML.
 * Usado para previews e cards onde não queremos renderizar formatação.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return clean.trim();
}

/**
 * Sanitiza HTML mantendo tags seguras.
 * Usado apenas no modal de visualização completa da tarefa.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p','strong','em','u','s','h1','h2','h3','ul','ol','li','br','a'],
    ALLOWED_ATTR: ['href','target','rel'],
  });
}

/**
 * Returns the URL if it uses an allowed safe protocol (http/https/mailto/tel),
 * otherwise returns null. Prevents javascript:, data:, vbscript:, etc.
 */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!/^(https?:|mailto:|tel:)/i.test(trimmed)) return null;
  return trimmed;
}

/**
 * Safely opens an external URL in a new tab, ignoring unsafe protocols.
 */
export function safeOpen(url: string | null | undefined): void {
  const safe = safeUrl(url);
  if (safe) window.open(safe, '_blank', 'noopener,noreferrer');
}
