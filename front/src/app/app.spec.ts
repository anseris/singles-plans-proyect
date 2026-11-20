import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { App } from './app';
import { AuthService, type AppUser } from './core/auth/auth.service';
import { EventsService } from './features/events/data-access/events.service';
import { GroupsService } from './features/groups/data-access/groups.service';

describe('App', () => {
  let requestedSection: 'events' | 'trips' | null;
  let currentUser: ReturnType<typeof signal<AppUser | null>>;

  beforeEach(async () => {
    requestedSection = null;
    currentUser = signal<AppUser | null>(null);
    const auth = {
      user: currentUser,
      restoreSession: async () => {},
      login: async () => {},
      register: async () => {},
      logout: () => {}
    };
    const events = {
      publicEvents: (section: 'events' | 'trips') => {
        requestedSection = section;
        return of([]);
      },
      adminEvents: () => of([]),
      myGroups: () => of([]),
      enroll: () => of({ message: 'ok' }),
      create: () => of({}),
      update: () => of({}),
      remove: () => of(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: EventsService, useValue: events },
        { provide: GroupsService, useValue: { myGroups: () => of([]), createGroup: () => of({}) } },
        providePrimeNG({ theme: { preset: Aura } })
      ]
    }).compileComponents();
  });

  it('shows only the Events and Trips public sections', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('SinglesPlans');
    expect(compiled.querySelector('.hero h1')?.textContent).toContain('Encuentra tu gente.');
    expect(Array.from(compiled.querySelectorAll('.main-nav button')).map((button) => button.textContent?.trim())).toEqual(['Eventos', 'Viajes']);

    const tripsButton = Array.from(compiled.querySelectorAll('.main-nav button')).find((button) => button.textContent?.trim() === 'Viajes');
    tripsButton?.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(requestedSection).toBe('trips');
  });

  it('requires an account before opening group creation', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance.vm;

    app.openCreateGroup();

    expect(app.groupOpen()).toBe(false);
    expect(app.dialogOpen()).toBe(true);
    expect(app.authMode()).toBe('register');
  });

  it('asks for the group age range when creating a group', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance.vm;
    currentUser.set({ id: 'user-1', name: 'Ana', email: 'ana@example.com', role: 'user' });

    app.openCreateGroup();
    fixture.detectChanges();

    const ageRange = fixture.nativeElement.querySelector('.age-range-field') as HTMLFieldSetElement;
    expect(ageRange.querySelector('legend')?.textContent).toContain('Rango de edad');
    expect(ageRange.querySelector('[name="minAge"]')).toBeTruthy();
    expect(ageRange.querySelector('[name="maxAge"]')).toBeTruthy();
  });

  it('opens the group detail view from a compact group card', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance.vm;
    currentUser.set({ id: 'user-1', name: 'Ana', email: 'ana@example.com', role: 'user' });
    app.groups.set([{
      _id: 'group-1',
      name: 'Senderismo',
      description: 'Rutas para descubrir la sierra.',
      city: 'Madrid',
      ageRange: { min: 25, max: 45 },
      imageUrl: 'data:image/png;base64,aGVsbG8='
    }]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.group-card-main') as HTMLButtonElement).click();
    fixture.detectChanges();

    const detail = fixture.nativeElement.querySelector('.group-detail-card') as HTMLElement;
    expect(detail.textContent).toContain('Senderismo');
    expect(detail.textContent).toContain('Madrid');
    expect(detail.textContent).toContain('Rutas para descubrir la sierra.');
    expect(detail.querySelector('.group-detail-image')?.getAttribute('src')).toBe('data:image/png;base64,aGVsbG8=');
    expect(detail.textContent).toContain('Crear evento');
  });
});
