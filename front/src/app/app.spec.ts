import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { App } from './app';
import { AuthService, type AppUser } from './auth.service';
import { EventsService } from './events.service';

describe('App', () => {
  beforeEach(async () => {
    const auth = {
      user: signal<AppUser | null>(null),
      restoreSession: async () => {},
      login: async () => {},
      register: async () => {},
      logout: () => {}
    };
    const events = {
      publicEvents: () => of([]),
      adminEvents: () => of([]),
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
        providePrimeNG({ theme: { preset: Aura } })
      ]
    }).compileComponents();
  });

  it('renders the public SinglesPlans landing page', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('SinglesPlans');
    expect(compiled.querySelector('.hero h1')?.textContent).toContain('Conoce gente.');
  });
});
