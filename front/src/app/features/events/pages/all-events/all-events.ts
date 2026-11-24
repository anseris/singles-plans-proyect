import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EventCard } from '../../components/event-card/event-card';
import { EventsService } from '../../data-access/events.service';
import type { EventItem } from '../../models/event.model';
import { groupEventsByDay } from '../../utils/group-events-by-day';
import { SinglesPlansFacade } from '../../../../core/application/singles-plans.facade';

@Component({
  selector: 'app-all-events',
  imports: [DatePipe, EventCard, RouterLink],
  templateUrl: './all-events.html',
  styleUrl: './all-events.scss',
})
export class AllEventsPage {
  private readonly eventsApi = inject(EventsService);
  readonly vm = inject(SinglesPlansFacade);
  readonly events = signal<EventItem[]>([]);
  readonly groupedEvents = computed(() => groupEventsByDay(this.events()));
  readonly loading = signal(true);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly actionNotice = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.events.set(await firstValueFrom(this.eventsApi.publicEvents('events')));
    } catch {
      this.error.set('No se pudieron cargar los eventos. Inténtalo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  async unenroll(event: EventItem): Promise<void> {
    this.actionError.set('');
    this.actionNotice.set('');
    const success = await this.vm.unenroll(event);
    if (!success) {
      this.actionError.set(this.vm.error());
      return;
    }
    this.events.update((events) =>
      events.map((item) =>
        item._id === event._id
          ? {
              ...item,
              isEnrolled: false,
              enrolledCount: Math.max(0, (item.enrolledCount ?? 0) - 1),
            }
          : item,
      ),
    );
    this.actionNotice.set(this.vm.notice());
  }
}
