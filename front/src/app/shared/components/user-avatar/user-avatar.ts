import { Component, computed, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-user-avatar',
  templateUrl: './user-avatar.html',
  styleUrl: './user-avatar.scss',
})
export class UserAvatar {
  readonly name = input.required<string>();
  readonly avatarUrl = input<string>('');
  readonly size = input<'small' | 'medium' | 'large'>('medium');
  readonly zoomable = input(false);

  readonly imageClick = output<string>();

  readonly imageFailed = signal(false);
  readonly initial = computed(() => {
    const name = this.name().trim();
    return name ? name.charAt(0).toLocaleUpperCase('es-ES') : '?';
  });
  readonly resolvedUrl = computed(() => {
    const url = this.avatarUrl()?.trim() ?? '';
    const apiOrigin =
      typeof window === 'undefined'
        ? ''
        : (window.SINGLESPLANS_CONFIG?.apiOrigin?.trim() ?? '').replace(/\/+$/, '');
    return apiOrigin && url.startsWith('/') ? `${apiOrigin}${url}` : url;
  });
  readonly showImage = computed(() => Boolean(this.resolvedUrl()) && !this.imageFailed());
  readonly canZoom = computed(() => this.zoomable() && this.showImage());

  onImageError(): void {
    this.imageFailed.set(true);
  }

  onImageClick(event?: Event): void {
    if (!this.canZoom()) return;
    event?.preventDefault();
    this.imageClick.emit(this.resolvedUrl());
  }
}
