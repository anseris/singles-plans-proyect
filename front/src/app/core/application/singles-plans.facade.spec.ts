import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, type AppUser } from '../auth/auth.service';
import { EventsService } from '../../features/events/data-access/events.service';
import { GroupsService } from '../../features/groups/data-access/groups.service';
import type { EventItem } from '../../features/events/models/event.model';
import type { GroupItem } from '../../features/groups/models/group.model';
import { SinglesPlansFacade } from './singles-plans.facade';

function event(id: string, status: EventItem['status'], groupId = 'group-1'): EventItem {
  return {
    _id: id,
    title: id,
    description: '',
    type: 'event',
    location: 'Madrid',
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    endsAt: new Date(Date.now() + 90000000).toISOString(),
    price: 0,
    capacity: 10,
    imageUrl: '',
    status,
    group: { _id: groupId, name: groupId, description: '', city: '' },
  };
}

const group: GroupItem = { _id: 'group-1', name: 'Mis rutas', description: '', city: 'Madrid' };

describe('SinglesPlansFacade event views', () => {
  let user: ReturnType<typeof signal<AppUser | null>>;
  let restoreCalls: number;
  let publicEventsCalls: number;
  let adminEventsCalls: number;
  let navigations: string[][];

  beforeEach(async () => {
    user = signal<AppUser | null>(null);
    restoreCalls = 0;
    publicEventsCalls = 0;
    adminEventsCalls = 0;
    navigations = [];

    const auth = {
      user,
      restoreSession: async () => {
        restoreCalls += 1;
        user.set({
          id: 'admin-1',
          name: 'Admin',
          email: 'admin@example.com',
          role: 'admin',
          superusuario: true,
        });
      },
      logout: () => user.set(null),
      oauthUrl: () => '/api/auth/oauth/google',
    };
    const events = {
      publicEvents: () => {
        publicEventsCalls += 1;
        return of([event('public-1', 'published')]);
      },
      adminEvents: () => {
        adminEventsCalls += 1;
        return of([event('admin-1', 'pending')]);
      },
      myEvents: () =>
        of({ created: [event('own-1', 'published'), event('own-2', 'pending')], enrolled: [] }),
      enroll: () => of({ message: 'ok', joinedGroup: false }),
      unenroll: () => of({ message: 'ok' }),
      create: () => of(event('new-1', 'pending')),
      update: () => of(event('new-1', 'published')),
      remove: () => of(undefined),
    };
    const groups = {
      allGroups: () => of([group]),
      allInterests: () => of([]),
      adminInterests: () => of([]),
      myGroups: () => of([group]),
      interestGroups: () => of([group]),
      adminGroups: () => of([group]),
      joinGroup: () => of({ message: 'ok' }),
      createGroup: () => of(group),
      createInterest: (name: string) => of({ _id: 'interest-1', name }),
      planSettings: () => of({ standardPrice: 2, standardFreeEvents: 3, proMonthlyPrice: 15 }),
      updatePlanSettings: () => of({ standardPrice: 2, standardFreeEvents: 3, proMonthlyPrice: 15 }),
    };

    await TestBed.configureTestingModule({
      providers: [
        SinglesPlansFacade,
        { provide: AuthService, useValue: auth },
        { provide: EventsService, useValue: events },
        { provide: GroupsService, useValue: groups },
        {
          provide: Router,
          useValue: { navigate: async (commands: string[]) => (navigations.push(commands), true) },
        },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('mantiene los eventos de los grupos aunque el usuario tenga eventos propios', () => {
    const facade = TestBed.inject(SinglesPlansFacade);
    facade.events.set([event('joined-1', 'published'), event('other-1', 'published', 'group-2')]);
    facade.interestGroups.set([group]);
    facade.myEvents.set([event('own-1', 'published')]);

    expect(facade.eventListView()).toBe('groups');
    expect(facade.visibleEvents().map((item) => item._id)).toEqual(['joined-1']);

    facade.setEventListView('published');
    expect(facade.visibleEvents().map((item) => item._id)).toEqual(['own-1']);
  });

  it('mantiene visibles los eventos cancelados propios y de los grupos', () => {
    const facade = TestBed.inject(SinglesPlansFacade);
    facade.events.set([event('joined-cancelled', 'cancelled')]);
    facade.interestGroups.set([group]);
    facade.myEvents.set([event('own-cancelled', 'cancelled')]);

    expect(facade.joinedGroupEvents().map((item) => item._id)).toEqual(['joined-cancelled']);
    expect(facade.myPublishedEvents().map((item) => item._id)).toEqual(['own-cancelled']);
  });

  it('separa las propuestas pendientes de los eventos propios publicados', () => {
    const facade = TestBed.inject(SinglesPlansFacade);
    facade.myEvents.set([event('own-1', 'published'), event('own-2', 'pending')]);

    expect(facade.myPublishedEvents().map((item) => item._id)).toEqual(['own-1']);
    expect(facade.myPendingEvents().map((item) => item._id)).toEqual(['own-2']);

    facade.setEventListView('pending');
    expect(facade.visibleEvents().map((item) => item._id)).toEqual(['own-2']);
  });

  it('entra en administración con una sola restauración de sesión y eventos de administración', async () => {
    const facade = TestBed.inject(SinglesPlansFacade);

    const allowed = await facade.enterAdminView();

    expect(allowed).toBe(true);
    expect(restoreCalls).toBe(1);
    expect(adminEventsCalls).toBe(1);
    expect(publicEventsCalls).toBe(0);
    expect(facade.adminView()).toBe(true);
    expect(facade.events().map((item) => item._id)).toEqual(['admin-1']);
  });

  it('vuelve a la vista pública y navega a /eventos al salir de administración', async () => {
    const facade = TestBed.inject(SinglesPlansFacade);
    await facade.enterAdminView();

    facade.switchView(false);

    expect(facade.adminView()).toBe(false);
    expect(navigations).toContainEqual(['/eventos']);
  });
});
