import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { SinglesPlansFacade } from '../../../../core/application/singles-plans.facade';
import { EventsService } from '../../data-access/events.service';
import type { EventDetails } from '../../models/event.model';

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink, DatePipe, CurrencyPipe, ButtonModule, DialogModule, TagModule],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.scss',
})
export class EventDetailPage {
  readonly vm = inject(SinglesPlansFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventsApi = inject(EventsService);
  readonly event = signal<EventDetails | null>(null);
  readonly canManageEvent = computed(() => this.vm.isAdmin || !!this.event()?.isCreator);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly attendanceDialogOpen = signal(false);
  readonly attendanceSubmitting = signal(false);
  readonly unenrolling = signal(false);
  readonly attendanceError = signal('');
  readonly attendanceNotice = signal('');
  readonly managementAction = signal<'cancel' | 'delete' | null>(null);
  readonly managementSubmitting = signal(false);
  readonly managementError = signal('');

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('No se encontró el evento.');
      this.loading.set(false);
      return;
    }
    await this.loadEvent(id);
  }

  async loadEvent(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.event.set(await firstValueFrom(this.eventsApi.eventDetails(id)));
    } catch {
      this.error.set('No se pudo cargar el evento. Puede que ya no esté disponible.');
    } finally {
      this.loading.set(false);
    }
  }

  meetingPointMapUrl(event: EventDetails): string {
    const point = event.meetingPoint;
    const hasCoordinates =
      point !== undefined &&
      typeof point.latitude === 'number' &&
      typeof point.longitude === 'number';
    const namedQuery = [point?.name, point?.address, event.location].filter(Boolean).join(', ');
    const query = point?.placeId
      ? namedQuery
      : hasCoordinates
        ? `${point.latitude},${point.longitude}`
        : namedQuery;
    const url = new URL('https://www.google.com/maps/search/');
    url.searchParams.set('api', '1');
    url.searchParams.set('query', query);
    if (point?.placeId) url.searchParams.set('query_place_id', point.placeId);
    return url.toString();
  }

  requestAttendance(): void {
    if (!this.vm.user()) {
      this.vm.openAuth('login');
      return;
    }
    this.attendanceError.set('');
    this.attendanceNotice.set('');
    const event = this.event();
    const groupId = event?.group?._id ?? event?.groupId;
    const isGroupMember =
      !!groupId && this.vm.interestGroups().some((group) => group._id === groupId);
    if (isGroupMember) {
      void this.confirmAttendance(false);
      return;
    }
    this.attendanceDialogOpen.set(true);
  }

  async unenroll(): Promise<void> {
    const event = this.event();
    if (!event?.isEnrolled || this.unenrolling()) return;

    this.unenrolling.set(true);
    this.attendanceError.set('');
    this.attendanceNotice.set('');
    const success = await this.vm.unenroll(event);
    if (success) {
      this.event.set({
        ...event,
        isEnrolled: false,
        enrolledCount: Math.max(0, (event.enrolledCount ?? 0) - 1),
      });
      this.attendanceNotice.set(this.vm.notice());
    } else {
      this.attendanceError.set(this.vm.error() || 'No se pudo cancelar tu asistencia.');
    }
    this.unenrolling.set(false);
  }

  editEvent(event: EventDetails): void {
    this.vm.openEditEvent(event);
  }

  openManagementAction(action: 'cancel' | 'delete'): void {
    this.managementError.set('');
    this.managementAction.set(action);
  }

  async confirmManagementAction(): Promise<void> {
    const event = this.event();
    const action = this.managementAction();
    if (!event || !action || !this.canManageEvent()) return;

    this.managementSubmitting.set(true);
    this.managementError.set('');
    try {
      if (action === 'delete') {
        await firstValueFrom(this.eventsApi.remove(event._id, this.vm.isAdmin));
        this.managementAction.set(null);
        await this.vm.loadEvents();
        void this.router.navigate(['/eventos']);
        return;
      }

      await firstValueFrom(this.eventsApi.cancel(event._id, this.vm.isAdmin));
      this.event.set({ ...event, status: 'cancelled' });
      this.managementAction.set(null);
      await this.vm.loadEvents();
      this.vm.notice.set('El evento se ha cancelado y ya no aparece en los eventos públicos.');
    } catch (error) {
      this.managementError.set(
        error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
          ? error.error.message
          : action === 'delete'
            ? 'No se pudo eliminar el evento. Inténtalo de nuevo.'
            : 'No se pudo cancelar el evento. Inténtalo de nuevo.',
      );
    } finally {
      this.managementSubmitting.set(false);
    }
  }

  async confirmAttendance(joinGroup: boolean): Promise<void> {
    const event = this.event();
    if (!event) return;
    this.attendanceSubmitting.set(true);
    this.attendanceError.set('');
    this.attendanceNotice.set('');
    const enrolled = await this.vm.enroll(event, joinGroup);
    if (enrolled) {
      this.event.set({
        ...event,
        isEnrolled: true,
        enrolledCount: (event.enrolledCount ?? 0) + 1,
      });
      this.attendanceDialogOpen.set(false);
    } else if (!this.attendanceDialogOpen()) {
      this.attendanceError.set(this.vm.error() || 'No se pudo confirmar tu asistencia.');
    }
    this.attendanceSubmitting.set(false);
  }
}
