import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UiButton, UiDialog } from '../../../../shared/design-system';
import type { GroupDetails, GroupItem } from '../../models/group.model';
import type { EventItem } from '../../../events/models/event.model';
import { SinglesPlansFacade } from '../../../../core/application/singles-plans.facade';
import { GroupsService } from '../../data-access/groups.service';
import { UserAvatar } from '../../../../shared/components/user-avatar/user-avatar';
import { GroupDetailView } from '../../../../shared/components/group-detail-view/group-detail-view';
import { UserInfo } from '../../../../shared/components/user-info/user-info';
import { RichText } from '../../../../shared/components/rich-text/rich-text';
import { EventCard } from '../../../events/components/event-card/event-card';

@Component({
  selector: 'app-group-detail',
  imports: [UiButton, UiDialog, RouterLink, EventCard, UserAvatar, GroupDetailView, UserInfo, RichText],
  templateUrl: './group-detail.html',
  styleUrl: './group-detail.scss'
})
export class GroupDetail {
  readonly group = signal<GroupItem | null>(null);
  readonly canCreateEvent = signal(false);
  readonly canManageGroup = computed(() => {
    const details = this.details();
    return !!details && (
      this.vm.isAdmin || this.vm.user()?.id === details.createdById
    );
  });
  readonly managedEvents = computed(() => {
    const group = this.group();
    if (!group) return [];
    return this.vm.myEvents().filter((event) => this.eventGroupId(event) === group._id);
  });
  readonly isCancelled = computed(() => this.group()?.status === 'cancelled');
  readonly deleteDialogOpen = signal(false);
  readonly deleteLoading = signal(false);
  readonly deleteError = signal('');
  readonly cancelDialogOpen = signal(false);
  readonly cancelLoading = signal(false);
  readonly cancelError = signal('');
  readonly activeTab = signal<'about' | 'events' | 'members'>('about');
  readonly eventsTab = signal<'upcoming' | 'past' | 'managed'>('upcoming');
  readonly selectedUserId = signal('');
  readonly details = signal<GroupDetails | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly groupsApi = inject(GroupsService);
  readonly vm = inject(SinglesPlansFacade);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.error.set('No se encontró el grupo.');
      return;
    }
    try {
      const details = await firstValueFrom(this.groupsApi.groupDetails(id));
      this.details.set(details);
      this.group.set(details.group);
      this.canCreateEvent.set(
        this.vm.isAdmin ||
        this.vm.user()?.id === details.createdById ||
        this.vm.myGroups().some((group) => group._id === details.group._id)
      );
    } catch {
      this.error.set('No se pudieron cargar los detalles del grupo. Inténtalo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  private eventGroupId(event: EventItem): string {
    return event.groupId ?? event.group?._id ?? '';
  }

  openUserInfo(id: string): void {
    this.selectedUserId.set(id);
  }

  createEvent(group: GroupItem): void {
    void this.router.navigate(['/eventos/crear'], { queryParams: { grupo: group._id } });
  }

  editGroup(group: GroupItem): void {
    void this.router.navigate(['/grupos/crear'], { queryParams: { editar: group._id } });
  }

  async cancelGroup(): Promise<void> {
    const group = this.group();
    if (!group || !this.canManageGroup() || this.isCancelled()) return;
    this.cancelLoading.set(true);
    this.cancelError.set('');
    try {
      const updated = await firstValueFrom(this.groupsApi.cancelGroup(group._id));
      this.group.set(updated);
      this.details.update((details) => details ? { ...details, group: updated } : details);
      this.cancelDialogOpen.set(false);
      await this.vm.loadEvents();
      this.vm.notice.set('El grupo se ha cancelado y seguirá apareciendo con el sello «Cancelado».');
    } catch (error) {
      this.cancelError.set(
        error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
          ? error.error.message
          : 'No se pudo cancelar el grupo. Inténtalo de nuevo.',
      );
    } finally {
      this.cancelLoading.set(false);
    }
  }

  async deleteGroup(): Promise<void> {
    const group = this.group();
    if (!group || !this.canManageGroup()) return;
    this.deleteLoading.set(true);
    this.deleteError.set('');
    try {
      await firstValueFrom(this.groupsApi.deleteGroup(group._id));
      this.deleteDialogOpen.set(false);
      await this.vm.loadEvents();
      void this.router.navigate(['/eventos']);
    } catch (error) {
      this.deleteError.set(
        error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
          ? error.error.message
          : 'No se pudo eliminar el grupo. Inténtalo de nuevo.',
      );
    } finally {
      this.deleteLoading.set(false);
    }
  }

}
