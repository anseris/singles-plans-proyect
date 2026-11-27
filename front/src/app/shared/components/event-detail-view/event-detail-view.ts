import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EventItem } from '../../../features/events/models/event.model';
import { meetingPointMapUrl } from '../../utils/event-detail';
import { RichText } from '../rich-text/rich-text';
import { UserAvatar } from '../user-avatar/user-avatar';

@Component({
  selector: 'app-event-detail-view',
  imports: [RouterLink, DatePipe, CurrencyPipe, UserAvatar, RichText],
  templateUrl: './event-detail-view.html',
  styleUrl: './event-detail-view.scss',
})
export class EventDetailView {
  readonly event = input.required<EventItem>();
  readonly interactive = input(true);
  readonly organizerSelected = output<string>();

  readonly organizerName = computed(
    () => this.event().createdBy?.name || 'Comunidad SinglesPlans',
  );
  readonly organizerId = computed(() => {
    const creator = this.event().createdBy;
    return creator?._id ?? creator?.id ?? '';
  });
  readonly mapUrl = computed(() => meetingPointMapUrl(this.event()));
  readonly ageRangeLabel = computed(() => {
    const range = this.event().ageRange;
    return range ? `${range.min}–${range.max} años` : 'A partir de 18 años';
  });
  readonly timeOfDayLabel = computed(() => {
    const value = this.event().timeOfDay;
    return value === 'night' ? 'Noche' : value === 'all-day' ? 'Todo el día' : 'Tarde';
  });

  openOrganizer(): void {
    const id = this.organizerId();
    if (this.interactive() && id) this.organizerSelected.emit(id);
  }
}
