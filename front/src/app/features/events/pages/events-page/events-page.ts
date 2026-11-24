import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { EventItem } from '../../models/event.model';
import type { GroupItem } from '../../../groups/models/group.model';
import { EventCard } from '../../components/event-card/event-card';
import { GroupCollection } from '../../../groups/components/group-collection/group-collection';
import { groupEventsByDay } from '../../utils/group-events-by-day';

@Component({
  selector: 'app-events-page',
  imports: [ButtonModule, DatePipe, EventCard, GroupCollection, RouterLink],
  templateUrl: './events-page.html',
  styleUrl: './events-page.scss'
})
export class EventsPage {
  readonly activeSection = input.required<'events' | 'trips'>();
  readonly myGroups = input.required<GroupItem[]>();
  readonly allGroups = input.required<GroupItem[]>();
  readonly interestGroups = input<GroupItem[]>([]);
  readonly canCreateAnyEvent = input(false);
  readonly authenticated = input.required<boolean>();
  readonly events = input.required<EventItem[]>();
  readonly filteredEvents = input.required<EventItem[]>();
  readonly loading = input.required<boolean>();
  readonly error = input.required<string>();
  readonly notice = input.required<string>();
  readonly groupJoinNotice = input('');
  readonly searchTerm = input.required<string>();
  readonly adminView = input.required<boolean>();
  readonly isSuperusuario = input(false);
  readonly myEventsCount = input(0);
  readonly myEvents = input<EventItem[]>([]);
  readonly myJoinedEventsCount = input(0);
  readonly eventListView = input<'published' | 'joined'>('published');
  readonly unenrollingEventId = input<string | null>(null);
  readonly groupedEvents = computed(() => groupEventsByDay(this.filteredEvents()));
  readonly createGroupRequested = output<void>();
  readonly loginRequested = output<void>();
  readonly groupSelected = output<GroupItem>();
  readonly eventRequested = output<GroupItem>();
  readonly joinRequested = output<GroupItem>();
  readonly enrollRequested = output<EventItem>();
  readonly statusChanged = output<{ event: EventItem; status: 'published' | 'rejected' }>();
  readonly editRequested = output<EventItem>();
  readonly deleteRequested = output<EventItem>();
  readonly searchChanged = output<Event>();
  readonly searchCleared = output<void>();
  readonly plansRequested = output<void>();
  readonly eventListViewSelected = output<'published' | 'joined'>();
  readonly unenrollRequested = output<EventItem>();

  ownsEvent(event: EventItem): boolean {
    return this.myEvents().some((ownedEvent) => ownedEvent._id === event._id);
  }
}
