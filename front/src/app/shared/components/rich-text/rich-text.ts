import { Component, computed, inject, input, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { sanitizeRichText } from '../../utils/rich-text';

@Component({
  selector: 'app-rich-text',
  template: `<div class="rich-text-content" [innerHTML]="safeHtml()"></div>`,
})
export class RichText {
  readonly html = input('');

  private readonly sanitizer = inject(DomSanitizer);

  readonly safeHtml = computed(() => {
    const cleaned = sanitizeRichText(this.html());
    return this.sanitizer.sanitize(SecurityContext.HTML, cleaned) ?? '';
  });
}
