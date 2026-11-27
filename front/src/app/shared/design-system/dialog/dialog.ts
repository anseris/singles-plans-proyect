import { NgClass } from '@angular/common';
import { Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'p-dialog',
  imports: [NgClass],
  template: `
    @if (visible()) {
      <div class="sp-dialog-backdrop" (click)="onBackdropClick()">
        <section
          class="sp-dialog"
          [ngClass]="styleClass()"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="header() || 'Diálogo'"
          (click)="$event.stopPropagation()"
        >
          <header class="sp-dialog-header">
            <h2>{{ header() }}</h2>
            <button
              class="sp-dialog-close"
              type="button"
              aria-label="Cerrar"
              (click)="close()"
            >
              <i class="pi pi-times" aria-hidden="true"></i>
            </button>
          </header>
          <div class="sp-dialog-content">
            <ng-content />
          </div>
        </section>
      </div>
    }
  `,
})
export class UiDialog {
  readonly visible = input(false);
  readonly header = input('');
  readonly styleClass = input('');
  readonly dismissableMask = input(false);
  readonly modal = input(true);
  readonly draggable = input(false);
  readonly resizable = input(false);

  readonly visibleChange = output<boolean>();

  close(): void {
    this.visibleChange.emit(false);
  }

  onBackdropClick(): void {
    if (this.dismissableMask()) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible()) this.close();
  }
}
