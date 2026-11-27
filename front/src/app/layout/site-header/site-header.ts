import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiButton } from '../../shared/design-system';
import type { AppUser } from '../../core/auth/auth.service';
import { UserAvatar } from '../../shared/components/user-avatar/user-avatar';

@Component({
  selector: 'app-site-header',
  imports: [UiButton, RouterLink, UserAvatar],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeader {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly user = input.required<AppUser | null>();
  readonly activeSection = input.required<'events' | 'trips'>();
  readonly adminView = input.required<boolean>();
  readonly sectionSelected = output<'events' | 'trips'>();
  readonly adminViewToggled = output<void>();
  readonly loginRequested = output<void>();
  readonly registerRequested = output<void>();
  readonly logoutRequested = output<void>();

  readonly menuOpen = signal(false);

  get isAdmin(): boolean {
    return this.user()?.role === 'admin';
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }
}
