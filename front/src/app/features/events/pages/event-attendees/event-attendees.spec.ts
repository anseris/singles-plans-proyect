import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { EventsService } from '../../data-access/events.service';
import type { EventAttendee } from '../../models/event.model';
import { EventAttendeesPage } from './event-attendees';

describe('EventAttendeesPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'event-1' } } } },
        {
          provide: EventsService,
          useValue: {
            eventDetails: () => of({ title: 'Plan' }),
            eventAttendees: () => of([]),
          },
        },
      ],
    });
  });

  it('separa los asistentes activos de quienes han cancelado', () => {
    const page = TestBed.runInInjectionContext(() => new EventAttendeesPage());
    page.attendees.set([
      { id: 'ana', name: 'Ana', status: 'active' },
      { id: 'luis', name: 'Luis', status: 'cancelled' },
      { id: 'maría', name: 'María', status: 'active' },
    ] as EventAttendee[]);

    expect(page.activeAttendees().map((attendee) => attendee.id)).toEqual(['ana', 'maría']);
    expect(page.cancelledAttendees().map((attendee) => attendee.id)).toEqual(['luis']);
    expect(page.visibleAttendees().map((attendee) => attendee.id)).toEqual(['ana', 'maría']);

    page.activeTab.set('cancelled');
    expect(page.visibleAttendees().map((attendee) => attendee.id)).toEqual(['luis']);
  });
});
