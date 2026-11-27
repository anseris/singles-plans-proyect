export const GROUP_DESCRIPTION_MAX = 1500;
export const EVENT_DESCRIPTION_MAX = 5000;

const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'a',
]);

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Mantiene solo las etiquetas y atributos que el editor de texto enriquecido puede producir. */
export function sanitizeDescription(value: string): string {
  return value.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, rawTag: string, attributes: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    const closing = match.startsWith('</');
    if (tag !== 'a') return closing ? `</${tag}>` : `<${tag}>`;
    if (closing) return '</a>';

    const hrefMatch = attributes.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? '';
    if (!/^(https?:\/\/|mailto:)/i.test(href)) return '';
    return `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">`;
  }).trim();
}

/** Longitud del texto visible, sin contar las etiquetas del HTML. */
export function descriptionTextLength(value: string): number {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim().length;
}

export function isValidDescription(value: unknown, maxLength: number): boolean {
  return typeof value === 'string' && descriptionTextLength(value) > 0 && descriptionTextLength(value) <= maxLength;
}
