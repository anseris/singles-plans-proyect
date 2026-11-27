import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';

type ButtonSeverity = 'primary' | 'secondary' | 'danger' | 'success' | 'warn';
type ButtonSize = 'medium' | 'small' | 'large';

@Component({
  selector: 'p-button',
  imports: [NgClass],
  host: { class: 'sp-button-host' },
  template: `
    <button
      class="sp-button"
      [ngClass]="[
        'sp-button-' + severity(),
        'sp-button-' + size(),
        styleClass(),
        iconPos() === 'right' ? 'sp-button-icon-right' : ''
      ]"
      [attr.type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading()"
      (click)="onClick.emit($event)"
    >
      @if (loading()) {
        <span class="sp-button-spinner" aria-hidden="true"></span>
      } @else if (icon()) {
        <i [class]="icon()" aria-hidden="true"></i>
      }
      @if (label()) {
        <span>{{ label() }}</span>
      }
      <ng-content />
    </button>
  `,
})
export class UiButton {
  readonly label = input('');
  readonly icon = input('');
  readonly iconPos = input<'left' | 'right'>('left');
  readonly severity = input<ButtonSeverity>('primary');
  readonly size = input<ButtonSize>('medium');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly styleClass = input('');

  readonly onClick = output<MouseEvent>();
}
