const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'DIV',
  'SPAN',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'A',
]);

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPE_MAP[char] ?? char);
}

function isSafeHref(href: string): boolean {
  try {
    const origin =
      typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const url = new URL(href, origin);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
}

/** Convierte el HTML guardado en texto visible, para validar longitud y contar caracteres. */
export function richTextToPlainText(html: string | null | undefined): string {
  const raw = (html ?? '').trim();
  if (!raw) return '';
  if (typeof document === 'undefined') return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const container = document.createElement('div');
  container.innerHTML = raw;
  return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Normaliza el HTML del editor a una lista cerrada de etiquetas y atributos.
 * El texto plano se transforma en párrafos para que las descripciones antiguas
 * se vean igual que las nuevas.
 */
export function sanitizeRichText(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';

  if (!/[<>]/.test(raw)) {
    return raw
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join('');
  }

  if (typeof document === 'undefined' || typeof DOMParser === 'undefined') {
    return escapeHtml(raw);
  }

  const doc = new DOMParser().parseFromString(`<body>${raw}</body>`, 'text/html');

  const cleanChildren = (source: Node): DocumentFragment => {
    const fragment = doc.createDocumentFragment();
    for (const child of Array.from(source.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? '';
        if (text) fragment.appendChild(doc.createTextNode(text));
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      const element = child as HTMLElement;
      const isLink = element.tagName === 'A';
      const href = isLink ? (element.getAttribute('href') ?? '') : '';
      if (!ALLOWED_TAGS.has(element.tagName) || (isLink && !isSafeHref(href))) {
        const inner = cleanChildren(element);
        while (inner.firstChild) fragment.appendChild(inner.firstChild);
        continue;
      }

      const target = doc.createElement(element.tagName.toLowerCase());
      if (isLink) {
        target.setAttribute('href', href);
        target.setAttribute('target', '_blank');
        target.setAttribute('rel', 'noopener noreferrer');
      }
      const inner = cleanChildren(element);
      while (inner.firstChild) target.appendChild(inner.firstChild);
      fragment.appendChild(target);
    }
    return fragment;
  };

  const result = doc.createElement('div');
  const cleaned = cleanChildren(doc.body);
  while (cleaned.firstChild) result.appendChild(cleaned.firstChild);
  return result.innerHTML.trim();
}
