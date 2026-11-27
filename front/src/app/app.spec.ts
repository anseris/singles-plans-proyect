import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
  let joinedGroupId: string | null;
  let resetRequest: { email: string; captchaToken: string } | null;
  let resetResponse: { message: string };
  let interests: { _id: string; name: string }[];
  let loginRequest: {
    email: string;
    password: string;
    rememberMe: boolean;
  } | null;

  beforeEach(async () => {
    requestedSection = null;
    joinedGroupId = null;
    resetRequest = null;
    resetResponse = { message: 'Si existe una cuenta con ese email, recibirás instrucciones.' };
    loginRequest = null;
    currentUser = signal<AppUser | null>(null);
    interests = [
      { _id: 'interest-1', name: 'Senderismo' },
      { _id: 'interest-2', name: 'Salir' },
      { _id: 'interest-3', name: 'Aperitivo' },
      { _id: 'interest-4', name: 'Tardeo' },
      { _id: 'interest-5', name: 'Conciertos' },
      { _id: 'interest-6', name: 'Deportes' },
    ];
    const auth = {
      user: currentUser,
      restoreSession: async () => {},
      login: async (email: string, password: string, rememberMe: boolean) => {
        loginRequest = { email, password, rememberMe };
      },
      register: async () => {},
      logout: () => {},
      requestPasswordReset: async (email: string, captchaToken: string) => {
        resetRequest = { email, captchaToken };
        return resetResponse;
      },
      resetPassword: async () => ({ message: 'Contraseña actualizada.' })
    };
    const events = {
      publicEvents: (section: 'events' | 'trips') => {
        requestedSection = section;
        return of([]);
      },
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
        { provide: GroupsService, useValue: {
          allGroups: () => of([]),
          allInterests: () => of(interests),
          adminInterests: () => of(interests),
          myGroups: () => of([]),
          interestGroups: () => of([]),
          joinGroup: (id: string) => {
            joinedGroupId = id;
            return of({ message: 'Ya formas parte de «Grupo público».' });
          },
          adminGroups: () => of([]),
          createGroup: () => of({}),
          createInterest: (name: string) => {
            const created = { _id: 'interest-new', name };
            interests = [...interests, created];
            return of(created);
          }
        } },
        providePrimeNG({ theme: { preset: Aura } }),
        provideRouter([])
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

  it('shows the first required step of the group creation wizard', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance.vm;
    currentUser.set({ id: 'user-1', name: 'Ana', email: 'ana@example.com', role: 'user' });

    app.openCreateGroup();
    fixture.detectChanges();

    expect(app.groupStep()).toBe(1);
    expect(fixture.nativeElement.querySelector('.group-step-indicator')?.textContent).toContain('Descripción');
    expect(fixture.nativeElement.querySelector('[name="groupName"]')?.required).toBe(true);
    expect(fixture.nativeElement.querySelector('.group-step-skip')).toBeNull();
    expect(fixture.nativeElement.querySelector('.group-step-indicator [aria-current="step"]')?.textContent).toContain('Nombre');
  });

  it('allows skipping optional group steps and selecting interests loaded from the API', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance.vm;
    currentUser.set({ id: 'user-1', name: 'Ana', email: 'ana@example.com', role: 'user' });

    await app.loadEvents();
    app.openCreateGroup();
    app.newGroup.name = 'Rutas con amigos';
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.group-form-actions p-button button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[name="groupCity"]')?.required).toBe(false);
    expect(app.groupStep()).toBe(2);
    app.newGroup.city = 'Madrid';
    app.skipGroupStep();
    expect(app.groupStep()).toBe(3);
    expect(app.newGroup.city).toBe('');
    app.skipGroupStep();
    expect(app.groupStep()).toBe(4);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.group-interest-tag').length).toBe(6);
    const interestTags = Array.from(fixture.nativeElement.querySelectorAll('.group-interest-tag')) as HTMLButtonElement[];
    expect(interestTags.length).toBe(6);
    interestTags[0].click();
    interestTags[4].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.group-interest-tag.selected').length).toBe(2);
    app.nextGroupStep();
    expect(app.groupStep()).toBe(5);
    expect(app.newGroup.interests).toEqual(['Senderismo', 'Conciertos']);

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[name="groupDescription"]')?.required).toBe(true);
  });

  it('requires a group name before advancing and a description before submission', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance.vm;
    currentUser.set({ id: 'user-1', name: 'Ana', email: 'ana@example.com', role: 'user' });
    app.openCreateGroup();

    app.nextGroupStep();
    expect(app.groupStep()).toBe(1);
    expect(app.error()).toContain('nombre');
    app.newGroup.name = 'Rutas con amigos';
    app.groupStep.set(5);
    await app.submitGroup();

    expect(app.groupStep()).toBe(5);
    expect(app.error()).toContain('descripción');
  });

  it('adds newly created interests to the catalog', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance.vm;

    await app.createInterest('Aperitivo');

    expect(app.availableGroupInterests().some((interest) => interest._id === 'interest-new' && interest.name === 'Aperitivo')).toBe(true);
    expect(app.notice()).toContain('Aperitivo');
  });

  it('walks through the nine event steps and validates required fields', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance.vm;
    currentUser.set({ id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin' });
    app.groups.set([{
      _id: 'group-1',
      name: 'Planes de Madrid',
      description: 'Planes en Madrid.',
      city: 'Madrid'
    }]);

    app.openCreateEvent();
    fixture.detectChanges();
    expect(app.eventStep()).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.event-step-indicator li')).toHaveLength(9);
    const stepIndicator = fixture.nativeElement.querySelector('.event-step-indicator') as HTMLOListElement;
    expect(stepIndicator.querySelectorAll('li small').length).toBe(0);
    expect(stepIndicator.classList.contains('full-field')).toBe(true);
    expect(window.getComputedStyle(stepIndicator).display).toBe('grid');
    expect(window.getComputedStyle(stepIndicator).overflowX).toBe('hidden');
    expect(fixture.nativeElement.querySelector('.event-current-step')?.textContent?.trim()).toBe('Nombre');
    expect(fixture.nativeElement.querySelector('.event-context-fields')?.classList.contains('full-field')).toBe(true);
    expect(fixture.nativeElement.querySelector('[name="type"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.event-context-fields label')).toBeNull();
    expect(app.eventAnyAge()).toBe(false);
    expect(app.eventIsFree()).toBe(false);
    app.nextEventStep();
    expect(app.eventStep()).toBe(1);
    expect(app.error()).toContain('nombre');

    app.newEvent.title = 'Quedada en el centro';
    app.nextEventStep();
    expect(app.eventStep()).toBe(2);
    app.newEvent.location = 'Madrid';
    app.nextEventStep();
    expect(app.eventStep()).toBe(3);
    app.setManualEventMeetingPoint('Café Central');
    app.nextEventStep();
    expect(app.eventStep()).toBe(4);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.event-image-attach .pi-paperclip')).not.toBeNull();
    app.skipEventStep();
    expect(app.eventStep()).toBe(5);
    app.skipEventStep();
    expect(app.eventStep()).toBe(6);
    expect(app.eventAnyAge()).toBe(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.event-age-step .event-switch')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.event-age-step .event-age-range')).not.toBeNull();
    expect((fixture.nativeElement.querySelector('[name="anyAge"]') as HTMLInputElement).checked).toBe(false);
    expect((fixture.nativeElement.querySelector('[name="minAge"]') as HTMLInputElement).matches(':disabled')).toBe(false);
    app.toggleEventAnyAge(true);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('[name="minAge"]') as HTMLInputElement).matches(':disabled')).toBe(true);
    app.toggleEventAnyAge(false);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('[name="minAge"]') as HTMLInputElement).matches(':disabled')).toBe(false);
    app.eventMinimumAge = 17;
    app.nextEventStep();
    expect(app.eventStep()).toBe(6);
    app.eventMinimumAge = 25;
    app.eventMaximumAge = 45;
    app.nextEventStep();
    expect(app.eventStep()).toBe(7);
    expect(app.newEvent.ageRange).toEqual({ min: 25, max: 45 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.event-schedule [name="startsAt"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.event-schedule [name="endsAt"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.event-schedule .event-time-of-day')).not.toBeNull();
    app.setEventTimeOfDay('all-day');
    expect(app.newEvent.startsAt.endsWith('T00:00')).toBe(true);
    expect(app.newEvent.endsAt.endsWith('T23:59')).toBe(true);
    app.nextEventStep();
    expect(app.eventStep()).toBe(8);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[name="capacity"]')?.required).toBe(true);
    expect(fixture.nativeElement.querySelector('.event-price-inline')).not.toBeNull();
    expect((fixture.nativeElement.querySelector('[name="isFree"]') as HTMLInputElement).checked).toBe(false);
    expect((fixture.nativeElement.querySelector('[name="price"]') as HTMLInputElement).matches(':disabled')).toBe(false);
    app.toggleEventFree(true);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('[name="price"]') as HTMLInputElement).matches(':disabled')).toBe(true);
    app.toggleEventFree(false);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('[name="price"]') as HTMLInputElement).matches(':disabled')).toBe(false);
    app.newEvent.price = 12.5;
    app.nextEventStep();
    expect(app.eventStep()).toBe(9);
    expect(app.newEvent.price).toBe(12.5);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[name="description"]')?.required).toBe(true);
  });

  it('searches and selects Google Places suggestions in the meeting-point input', async () => {
    const previousConfig = window.SINGLESPLANS_CONFIG;
    const previousGoogle = window.google;
    const requestedQueries: string[] = [];
    window.SINGLESPLANS_CONFIG = { googleMapsApiKey: 'test-key' };
    window.google = {
      maps: {
        importLibrary: async () => ({
          AutocompleteSuggestion: {
            fetchAutocompleteSuggestions: async ({ input }) => {
              requestedQueries.push(input);
              return {
                suggestions: [{
                  placePrediction: {
                    text: { toString: () => 'Café Central, Calle Córdoba, Madrid' },
                    mainText: { text: 'Café Central' },
                    secondaryText: { text: 'Calle Córdoba, Madrid' },
                    toPlace: () => ({
                      id: 'place-456',
                      displayName: { text: 'Café Central' },
                      formattedAddress: 'Calle Córdoba, Madrid',
                      location: { lat: () => 40.41, lng: () => -3.70 },
                      fetchFields: async () => {}
                    })
                  }
                }]
              };
            }
          }
        })
      }
    };

    const fixture = TestBed.createComponent(App);
    try {
      const app = fixture.componentInstance.vm;
      currentUser.set({ id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin' });
      app.groups.set([{
        _id: 'group-1',
        name: 'Planes de Madrid',
        description: 'Planes en Madrid.',
        city: 'Madrid'
      }]);
      app.openCreateEvent();
      app.eventStep.set(3);
      fixture.detectChanges();
      await fixture.whenStable();

      const input = fixture.nativeElement.querySelector('#meeting-point-search') as HTMLInputElement;
      input.value = 'Calle Córdoba';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
      fixture.detectChanges();

      expect(requestedQueries).toContain('Calle Córdoba');
      const suggestion = fixture.nativeElement.querySelector('.google-places-suggestion') as HTMLButtonElement;
      expect(suggestion).not.toBeNull();
      suggestion.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(input.value).toBe('Café Central, Calle Córdoba, Madrid');
      expect(app.newEvent.meetingPoint).toEqual({
        name: 'Café Central',
        address: 'Calle Córdoba, Madrid',
        placeId: 'place-456',
        latitude: 40.41,
        longitude: -3.7
      });
    } finally {
      fixture.destroy();
      window.SINGLESPLANS_CONFIG = previousConfig;
      window.google = previousGoogle;
    }
  });

  it('shows the event initial and a Google Maps link for the meeting point', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const start = new Date(Date.now() + 86400000).toISOString();
    fixture.componentInstance.vm.events.set([{
      _id: 'event-1',
      title: '  Encuentro en Madrid',
      description: 'Una tarde para conocernos.',
      type: 'event',
      location: 'Madrid',
      meetingPoint: {
        name: 'Café Central',
        address: 'Plaza Mayor, Madrid',
        placeId: 'place-123',
        latitude: 40.415,
        longitude: -3.707
      },
      interests: ['Aperitivo'],
      ageRange: null,
      timeOfDay: 'afternoon',
      startsAt: start,
      endsAt: new Date(Date.now() + 90000000).toISOString(),
      price: 0,
      capacity: 10,
      imageUrl: '',
      status: 'published'
    }]);
    fixture.componentInstance.vm.loading.set(false);
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('.event-image-placeholder') as HTMLElement).textContent?.trim()).toBe('E');
    const meetingLink = fixture.nativeElement.querySelector('.event-meeting-point') as HTMLAnchorElement;
    expect(meetingLink.href).toContain('https://www.google.com/maps/search/');
    expect(meetingLink.href).toContain('query_place_id=place-123');
    expect(meetingLink.textContent).toContain('Café Central');
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
    app.myGroups.set(app.groups());
    app.allGroups.set(app.groups());
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.group-card-main') as HTMLButtonElement).click();
    fixture.detectChanges();

    const detail = fixture.nativeElement.querySelector('.group-detail-card') as HTMLElement;
    expect(detail.textContent).toContain('Senderismo');
    expect(detail.textContent).toContain('Madrid');
    expect(fixture.nativeElement.querySelector('#group-about-panel')?.textContent).toContain(
      'Rutas para descubrir la sierra.'
    );
    expect(detail.querySelector('.group-detail-image')?.getAttribute('src')).toBe('data:image/png;base64,aGVsbG8=');
    expect(detail.textContent).toContain('Crear evento');
  });

  it('shows membership and managed tabs and links to the all-groups view', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const app = fixture.componentInstance.vm;
    currentUser.set({ id: 'user-1', name: 'Ana', email: 'ana@example.com', role: 'user' });
    const ownGroup = {
      _id: 'group-1',
      name: 'Mis rutas',
      description: 'Grupo propio.',
      city: 'Madrid'
    };
    const otherGroup = {
      _id: 'group-2',
      name: 'Grupo público',
      description: 'Grupo de otra persona.',
      city: 'Valencia'
    };
    app.groups.set([ownGroup]);
    app.myGroups.set([
      ownGroup,
      { ...ownGroup, _id: 'group-3', name: 'Rutas del norte' },
      { ...ownGroup, _id: 'group-4', name: 'Escapadas' }
    ]);
    app.allGroups.set([...app.myGroups(), otherGroup]);
    fixture.detectChanges();

    const tabs = Array.from(fixture.nativeElement.querySelectorAll('.group-tabs [role="tab"]')) as HTMLButtonElement[];
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['Mis grupos', 'Mis grupos gestionados']);
    expect((fixture.nativeElement.querySelector('.all-groups-link') as HTMLAnchorElement).getAttribute('href')).toBe('/grupos/todos');
    expect(fixture.nativeElement.querySelectorAll('.community-group-card').length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('.group-carousel-control').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.community-group-card')?.textContent).toContain('Mis rutas');

    app.interestGroups.set([otherGroup]);
    tabs[0].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.community-group-card').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.community-group-card')?.textContent).toContain('Grupo público');
    expect(fixture.nativeElement.querySelector('.community-group-card p-button')?.textContent).toContain('En mis grupos');
    app.interestGroups.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.community-group-empty')?.textContent).toContain('Aún no te has unido');
    tabs[1].click();
    app.myGroups.set([]);
    fixture.detectChanges();
    const remainingTabs = Array.from(fixture.nativeElement.querySelectorAll('.group-tabs [role="tab"]')) as HTMLButtonElement[];
    expect(remainingTabs.map((tab) => tab.textContent?.trim())).toEqual(['Mis grupos']);

    (fixture.nativeElement.querySelector('.all-groups-link') as HTMLAnchorElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.all-groups-page')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.community-group-card').length).toBe(4);
  });

  it('shows all public groups in the separate view when logged out', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.vm.allGroups.set([{
      _id: 'group-2',
      name: 'Grupo público',
      description: 'Grupo de otra persona.',
      city: 'Valencia'
    }]);
    fixture.detectChanges();

    const tabs = Array.from(fixture.nativeElement.querySelectorAll('.group-tabs [role="tab"]')) as HTMLButtonElement[];
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['Mis grupos']);
    expect(fixture.nativeElement.querySelectorAll('.community-group-card').length).toBe(0);
    (fixture.nativeElement.querySelector('.all-groups-link') as HTMLAnchorElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.community-group-card').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.community-group-card')?.textContent).toContain('Grupo público');
    const joinButton = fixture.nativeElement.querySelector('.community-group-card p-button button') as HTMLButtonElement;
    expect(joinButton.textContent).toContain('Unirme al grupo');
    joinButton.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.vm.dialogOpen()).toBe(true);
    expect(fixture.componentInstance.vm.authMode()).toBe('login');
  });

  it('uses the uppercase first letter as a group card image fallback', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.vm.allGroups.set([{
      _id: 'group-3',
      name: '  conciertos locales',
      description: 'Música en directo.',
      city: ''
    }]);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.all-groups-link') as HTMLAnchorElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const placeholder = fixture.nativeElement.querySelector('.group-image-placeholder') as HTMLElement;
    expect(placeholder.textContent?.trim()).toBe('C');
  });

  it('lets an authenticated user join a group and adds it to their interests', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const app = fixture.componentInstance.vm;
    currentUser.set({ id: 'user-1', name: 'Ana', email: 'ana@example.com', role: 'user' });
    const group = {
      _id: 'group-2',
      name: 'Grupo público',
      description: 'Grupo de otra persona.',
      city: 'Valencia'
    };

    await app.joinGroup(group);

    expect(joinedGroupId).toBe('group-2');
    expect(app.interestGroups()).toEqual([group]);
    expect(app.groupJoinNotice()).toBe('Te has unido al grupo «Grupo público».');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.community-groups [role="status"]')?.textContent).toContain('Grupo público');
  });

  it('shows the login form with all the requested authentication options', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance.vm;

    app.openAuth('login');
    fixture.detectChanges();

    expect(app.authStep()).toBe('login');
    expect(app.dialogOpen()).toBe(true);
    expect(app.loginFormValid()).toBe(false);
    expect(app.loginFieldError('email')).toBe('');
    app.markLoginTouched('email');
    expect(app.loginFieldError('email')).toBe('Escribe tu correo electrónico.');

    app.setLoginField('email', 'ana@example.com');
    app.setLoginField('password', 'contraseña');
    expect(app.loginFormValid()).toBe(true);
  });

  it('shows the provider choice before the email registration form', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance.vm;

    app.openAuth('register');
    expect(app.authStep()).toBe('register-choice');

    app.goToRegisterForm();
    expect(app.authStep()).toBe('register-form');
    expect(app.registerFormValid()).toBe(false);
  });

  it('keeps registration disabled until every field is valid', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance.vm;

    app.openAuth('register');
    app.goToRegisterForm();
    app.setRegisterField('name', 'Ana');
    app.setRegisterField('email', 'ana@example.com');
    app.setRegisterField('password', 'contraseña-segura');
    app.setRegisterField('confirmPassword', 'contraseña-segura');
    app.setRegisterField('location', 'Madrid');
    expect(app.registerFormValid()).toBe(false);

    app.setAdultConfirmed(true);
    expect(app.registerFormValid()).toBe(false);

    app.setCaptchaToken('test-token');
    expect(app.registerFormValid()).toBe(true);

    app.setRegisterField('confirmPassword', 'otra-contraseña');
    expect(app.registerFormValid()).toBe(false);
  });

  it('logs in without a Turnstile token', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance.vm;

    app.openAuth('login');
    app.setLoginField('email', 'ana@example.com');
    app.setLoginField('password', 'contraseña');
    await app.submitAuth();

    expect(loginRequest).toEqual({
      email: 'ana@example.com',
      password: 'contraseña',
      rememberMe: false
    });
    expect(app.dialogOpen()).toBe(false);
  });

  it('sends the Turnstile token when requesting password instructions', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance.vm;

    app.openAuth('login');
    app.forgotPassword();
    app.forgotEmail.set('ana@example.com');
    await app.requestPasswordReset();
    expect(app.error()).toContain('Soy humano');
    expect(resetRequest).toBeNull();

    app.setCaptchaToken('turnstile-token');
    await app.requestPasswordReset();

    expect(resetRequest).toEqual({
      email: 'ana@example.com',
      captchaToken: 'turnstile-token'
    });
    expect(app.notice()).toContain('instrucciones');
  });

});
