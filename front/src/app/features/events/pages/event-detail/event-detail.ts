import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  private readonly eventsApi = inject(EventsService);
  readonly event = signal<EventDetails | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly attendanceDialogOpen = signal(false);
  readonly attendanceSubmitting = signal(false);

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

  requestAttendance(): void {
    if (!this.vm.user()) {
      this.vm.openAuth('login');
      return;
    }
    this.attendanceDialogOpen.set(true);
  }

  async confirmAttendance(joinGroup: boolean): Promise<void> {
    const event = this.event();
    if (!event) return;
    this.attendanceSubmitting.set(true);
    const enrolled = await this.vm.enroll(event, joinGroup);
    if (enrolled) {
      event.isEnrolled = true;
      event.enrolledCount = (event.enrolledCount ?? 0) + 1;
      this.event.set({ ...event });
      this.attendanceDialogOpen.set(false);
    }
    this.attendanceSubmitting.set(false);
  }
}
