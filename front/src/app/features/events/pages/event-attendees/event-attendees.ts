import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UserAvatar } from '../../../../shared/components/user-avatar/user-avatar';
import { EventsService } from '../../data-access/events.service';
import type { EventAttendee } from '../../models/event.model';

@Component({
  selector: 'app-event-attendees',
  imports: [RouterLink, UserAvatar],
  templateUrl: './event-attendees.html',
  styleUrl: './event-attendees.scss'
})
export class EventAttendeesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly eventsApi = inject(EventsService);
  readonly eventId = signal('');
  readonly eventTitle = signal('');
  readonly attendees = signal<EventAttendee[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('No se encontró el evento.');
      this.loading.set(false);
      return;
    }
    this.eventId.set(id);
    try {
      const [event, attendees] = await Promise.all([
        firstValueFrom(this.eventsApi.eventDetails(id)),
        firstValueFrom(this.eventsApi.eventAttendees(id))
      ]);
      this.eventTitle.set(event.title);
      this.attendees.set(attendees);
    } catch {
      this.error.set('No se pudo cargar la lista de asistentes. Inténtalo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }
}
