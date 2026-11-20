import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import type { EventItem, EventStatus, EventType } from '../../models/event.model';

@Component({
  selector: 'app-event-card',
  imports: [CurrencyPipe, DatePipe, ButtonModule, TagModule],
  templateUrl: './event-card.html',
  styleUrl: './event-card.scss'
})
export class EventCard {
  readonly event = input.required<EventItem>();
  readonly index = input.required<number>();
  readonly adminView = input(false);
  readonly enrollRequested = output<EventItem>();
  readonly statusChanged = output<{ event: EventItem; status: 'published' | 'rejected' }>();
  readonly editRequested = output<EventItem>();
  readonly deleteRequested = output<EventItem>();

  remaining(event: EventItem): number {
    return Math.max(event.capacity - (event.enrolledCount ?? 0), 0);
  }

  typeLabel(type: EventType): string {
    return { excursion: 'Excursión', trip: 'Viaje', event: 'Evento' }[type];
  }

  statusLabel(status: EventStatus): string {
    return { pending: 'Pendiente', published: 'Publicado', rejected: 'Rechazado', cancelled: 'Cancelado' }[status];
  }
}
