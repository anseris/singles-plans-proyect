import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { SinglesPlansFacade } from '../../../../core/application/singles-plans.facade';
import { EventsService } from '../../data-access/events.service';
import type { EventDetails } from '../../models/event.model';
import { EventDetailPage } from './event-detail';

describe('EventDetailPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'event-1' } } } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: EventsService, useValue: { eventDetails: () => of({}) } },
        {
          provide: SinglesPlansFacade,
          useValue: {
            isAdmin: true,
            user: signal(null),
            notice: signal(''),
            error: signal(''),
          },
        },
      ],
    });
  });

  it('solo permite gestionar el evento a quien lo creó, aunque sea administrador', () => {
    const page = TestBed.runInInjectionContext(() => new EventDetailPage());
    const base = { _id: 'event-1', title: 'Plan', isEnrolled: false } as EventDetails;

    page.event.set({ ...base, isCreator: false });
    expect(page.canManageEvent()).toBe(false);

    page.event.set({ ...base, isCreator: true });
    expect(page.canManageEvent()).toBe(true);
  });
});
