import { richTextToPlainText, sanitizeRichText } from './rich-text';

describe('rich text', () => {
  it('convierte el texto plano en párrafos', () => {
    expect(sanitizeRichText('Primera línea\nSegunda línea')).toBe(
      '<p>Primera línea</p><p>Segunda línea</p>',
    );
  });

  it('conserva negrita, listas y enlaces seguros', () => {
    const html = '<p>Plan <strong>genial</strong></p><ul><li>uno</li></ul><a href="https://example.com">web</a>';
    const result = sanitizeRichText(html);

    expect(result).toContain('<strong>genial</strong>');
    expect(result).toContain('<ul>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('elimina scripts, atributos de evento y enlaces peligrosos', () => {
    const result = sanitizeRichText(
      '<p onclick="alert(1)">Hola<script>alert(2)</script><img src="x" onerror="alert(3)"></p>' +
        '<a href="javascript:alert(4)">malo</a>',
    );

    expect(result).not.toContain('script');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('javascript:');
    expect(result).toContain('Hola');
  });

  it('extrae solo el texto visible para contar caracteres', () => {
    expect(richTextToPlainText('<p>Hola <strong>mundo</strong></p>')).toBe('Hola mundo');
    expect(richTextToPlainText('')).toBe('');
  });
});
