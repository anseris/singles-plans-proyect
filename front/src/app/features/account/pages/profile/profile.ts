import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserAvatar } from '../../../../shared/components/user-avatar/user-avatar';
import { GroupsService } from '../../../groups/data-access/groups.service';
import type { GroupItem } from '../../../groups/models/group.model';

@Component({
  selector: 'app-profile-page',
  imports: [RouterLink, UserAvatar],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly groupsApi = inject(GroupsService);
  private groupsLoaded = false;

  readonly user = this.auth.user;
  readonly memberGroups = signal<GroupItem[]>([]);
  readonly managedGroups = signal<GroupItem[]>([]);
  readonly groupsLoading = signal(true);
  readonly groupsError = signal('');
  readonly groupsTab = signal<'mine' | 'managed'>('mine');

  readonly memberSince = computed(() => {
    const createdAt = this.user()?.createdAt;
    if (!createdAt) return '';
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return '';
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  });

  readonly showManagedTab = computed(
    () => this.user()?.superusuario === true || this.managedGroups().length > 0,
  );
  readonly visibleGroups = computed(() =>
    this.groupsTab() === 'managed' ? this.managedGroups() : this.memberGroups(),
  );

  constructor() {
    effect(() => {
      const current = this.user();
      if (!current || this.groupsLoaded) return;
      this.groupsLoaded = true;
      void this.loadGroups();
    });
  }

  selectTab(tab: 'mine' | 'managed'): void {
    this.groupsTab.set(tab);
  }

  groupInitial(name: string): string {
    return name.trim().charAt(0).toLocaleUpperCase('es-ES') || '?';
  }

  private async loadGroups(): Promise<void> {
    this.groupsLoading.set(true);
    this.groupsError.set('');
    try {
      const [memberGroups, managedGroups] = await Promise.all([
        firstValueFrom(this.groupsApi.interestGroups()),
        firstValueFrom(this.groupsApi.myGroups()),
      ]);
      this.memberGroups.set(memberGroups);
      this.managedGroups.set(managedGroups);
    } catch {
      this.groupsError.set('No se pudieron cargar tus grupos. Inténtalo de nuevo.');
    } finally {
      this.groupsLoading.set(false);
    }
  }
}
