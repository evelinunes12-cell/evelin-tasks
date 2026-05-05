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
