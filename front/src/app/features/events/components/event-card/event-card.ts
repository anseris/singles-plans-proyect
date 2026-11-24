import { Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import type { EventItem } from '../../models/event.model';

@Component({
  selector: 'app-event-card',
  templateUrl: './event-card.html',
  styleUrl: './event-card.scss'
})
export class EventCard {
  private readonly router = inject(Router);
  readonly event = input.required<EventItem>();
  readonly adminView = input(false);
  readonly isOwner = input(false);
  readonly unenrolling = input(false);
  readonly unenrollDisabled = input(false);
  readonly unenrollRequested = output<EventItem>();

  eventInitial(title: string): string {
    return title.trim().charAt(0).toLocaleUpperCase('es-ES') || '?';
  }

  eventDateTimeLabel(event: EventItem): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(event.startsAt));
  }

  openDetails(): void {
    void this.router.navigate(['/eventos/detalles', this.event()._id]);
  }
}
