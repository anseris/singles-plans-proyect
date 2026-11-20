import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import type { AppUser } from '../../core/auth/auth.service';

@Component({
  selector: 'app-site-header',
  imports: [ButtonModule],
  templateUrl: './site-header.html'
})
export class SiteHeader {
  readonly user = input.required<AppUser | null>();
  readonly activeSection = input.required<'events' | 'trips'>();
  readonly adminView = input.required<boolean>();
  readonly sectionSelected = output<'events' | 'trips'>();
  readonly adminViewToggled = output<void>();
  readonly loginRequested = output<void>();
  readonly registerRequested = output<void>();
  readonly logoutRequested = output<void>();

  get isAdmin(): boolean {
    return this.user()?.role === 'admin';
  }
}
