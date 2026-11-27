import { Component, computed, effect, HostListener, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiDialog } from '../../design-system';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { UsersService } from '../../../features/account/data-access/users.service';
import type { PublicUserProfile } from '../../../features/account/models/public-user.model';
import { UserAvatar } from '../user-avatar/user-avatar';

@Component({
  selector: 'app-user-info',
  imports: [UiDialog, RouterLink, UserAvatar],
  templateUrl: './user-info.html',
  styleUrl: './user-info.scss',
})
export class UserInfo {
  private readonly usersApi = inject(UsersService);
  private readonly auth = inject(AuthService);
  private requestId = 0;

  readonly userId = input('');
  readonly closed = output<void>();

  readonly isSelf = computed(() => {
    const id = this.userId();
    return !!id && id === this.auth.user()?.id;
  });
  readonly visible = computed(() => !!this.userId());
  readonly profile = signal<PublicUserProfile | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly expandedAvatarUrl = signal('');
  readonly memberSince = computed(() => {
    const value = this.profile()?.memberSince;
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  });

  constructor() {
    effect(() => {
      const id = this.userId();
      const currentRequest = ++this.requestId;
      if (!id) {
        this.profile.set(null);
        this.loading.set(false);
        this.error.set('');
        this.expandedAvatarUrl.set('');
        return;
      }
      this.profile.set(null);
      this.loading.set(true);
      this.error.set('');
      this.expandedAvatarUrl.set('');
      void firstValueFrom(this.usersApi.userById(id))
        .then((profile) => {
          if (currentRequest !== this.requestId) return;
          const user = this.isSelf() ? this.auth.user() : null;
          this.profile.set(
            user
              ? {
                  ...profile,
                  name: user.name,
                  avatarUrl: user.avatarUrl ?? '',
                  location: user.location ?? '',
                  aboutMe: user.aboutMe ?? '',
                  interests: [...(user.interests ?? [])],
                  maritalStatus: user.showMaritalStatus ? user.maritalStatus : '',
                }
              : profile,
          );
        })
        .catch(() => {
          if (currentRequest === this.requestId) this.error.set('No se pudo cargar la información de esta persona.');
        })
        .finally(() => {
          if (currentRequest === this.requestId) this.loading.set(false);
        });
    });
  }

  close(): void {
    if (this.expandedAvatarUrl()) {
      this.expandedAvatarUrl.set('');
      return;
    }
    this.closed.emit();
  }

  expandAvatar(url: string): void {
    this.expandedAvatarUrl.set(url);
  }

  closeAvatar(): void {
    this.expandedAvatarUrl.set('');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeAvatar();
  }
}
