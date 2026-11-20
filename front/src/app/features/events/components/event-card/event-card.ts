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

  eventInitial(title: string): string {
    return title.trim().charAt(0).toLocaleUpperCase('es-ES') || '?';
  }

  meetingPointMapUrl(event: EventItem): string {
    const point = event.meetingPoint;
    if (!point) return '';
    const query = encodeURIComponent(point.address || `${point.name}, ${event.location}`);
    const placeId = point.placeId ? `&query_place_id=${encodeURIComponent(point.placeId)}` : '';
    return `https://www.google.com/maps/search/?api=1&query=${query}${placeId}`;
  }

  timeOfDayLabel(event: EventItem): string {
    return { afternoon: 'Tarde', night: 'Noche', 'all-day': 'Todo el día' }[event.timeOfDay ?? 'afternoon'];
  }

  ageRangeLabel(event: EventItem): string {
    return event.ageRange ? `${event.ageRange.min}–${event.ageRange.max} años` : 'A partir de 18 años';
  }
}
