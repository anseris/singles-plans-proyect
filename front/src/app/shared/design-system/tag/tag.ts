import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'p-tag',
  imports: [NgClass],
  template: `
    <span class="sp-tag" [ngClass]="'sp-tag-' + severity()">{{ value() }}</span>
  `,
})
export class UiTag {
  readonly value = input('');
  readonly severity = input<'success' | 'warn' | 'danger' | 'secondary' | 'info'>('info');
}
