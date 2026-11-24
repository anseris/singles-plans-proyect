import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { EventsService } from '../../features/events/data-access/events.service';
import { GroupsService } from '../../features/groups/data-access/groups.service';
import type {
  EventCreateInput,
  EventItem,
  EventMeetingPoint,
  EventTimeOfDay,
} from '../../features/events/models/event.model';
import type {
  CreateGroupInput,
  GroupItem,
  InterestItem,
  PlanSettings,
} from '../../features/groups/models/group.model';

function isUpcomingPublished(event: EventItem): boolean {
  return event.status === 'published' && new Date(event.startsAt).getTime() >= Date.now();
}

function shouldShowOwnedEvent(event: EventItem): boolean {
  return event.status === 'pending' || isUpcomingPublished(event);
}

@Injectable({ providedIn: 'root' })
export class SinglesPlansFacade {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly eventsApi = inject(EventsService);
  private readonly groupsApi = inject(GroupsService);

  readonly events = signal<EventItem[]>([]);
  readonly myEvents = signal<EventItem[]>([]);
  readonly eventListView = signal<'published' | 'joined'>('published');
  readonly visibleEvents = computed(() => {
    if (this.activeSection() !== 'events' || (this.isAdmin && this.adminView())) {
      return this.events();
    }
    if (this.isSuperusuario && this.myEventsForList().length > 0) {
      return this.eventListView() === 'published'
        ? this.myEventsForList()
        : this.myEnrolledEvents();
    }
    const joinedGroupIds = new Set(this.interestGroups().map((group) => group._id));
    return this.events().filter((event) =>
      joinedGroupIds.has(event.group?._id ?? event.groupId ?? ''),
    );
  });
  readonly groups = signal<GroupItem[]>([]);
  readonly myGroups = signal<GroupItem[]>([]);
  readonly allGroups = signal<GroupItem[]>([]);
  readonly interestGroups = signal<GroupItem[]>([]);
  readonly enrolledEvents = signal<EventItem[]>([]);
  readonly myEventsForList = computed(() => this.myEvents().filter(shouldShowOwnedEvent));
  readonly myEnrolledEvents = computed(() => this.enrolledEvents().filter(isUpcomingPublished));
  readonly groupsNeedRefresh = signal(false);
  readonly availableGroupInterests = signal<InterestItem[]>([]);
  readonly planSettings = signal<PlanSettings>({
    standardPrice: 2,
    standardFreeEvents: 3,
    proMonthlyPrice: 15,
  });
  readonly user = this.auth.user;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notice = signal('');
  readonly groupJoinNotice = signal('');
  readonly unenrollingEventId = signal<string | null>(null);
  readonly dialogOpen = signal(false);
  readonly createOpen = signal(false);
  readonly groupOpen = signal(false);
  readonly selectedGroup = signal<GroupItem | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly authMode = signal<'login' | 'register'>('login');
  readonly adminView = signal(false);
  readonly activeSection = signal<'events' | 'trips'>('events');
  readonly searchTerm = signal('');
  readonly googleMapsApiKey = window.SINGLESPLANS_CONFIG?.googleMapsApiKey?.trim() ?? '';
  readonly pendingCount = computed(
    () => this.events().filter((event) => event.status === 'pending').length,
  );
  readonly publishedCount = computed(
    () => this.events().filter((event) => event.status === 'published').length,
  );
  readonly filteredEvents = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase('es');
    return this.visibleEvents().filter((event) => {
      const searchableText =
        `${event.title} ${event.description} ${event.location} ${event.meetingPoint?.name ?? ''}`.toLocaleLowerCase(
          'es',
        );
      return !query || searchableText.includes(query);
    });
  });

  credentials = { name: '', email: '', password: '' };
  newEvent: EventCreateInput = this.emptyEvent();
  readonly eventStepLabels = [
    'Nombre',
    'Zona o ciudad',
    'Punto de encuentro',
    'Imagen',
    'Intereses',
    'Rango de edad',
    'Empieza / Termina',
    'Plazas y precio',
    'Descripción',
  ] as const;
  readonly eventStep = signal(1);
  readonly newEventInterestOptions = signal<string[]>([]);
  readonly eventAnyAge = signal(false);
  eventMinimumAge = 18;
  eventMaximumAge = 100;
  readonly eventIsFree = signal(false);
  readonly groupStepLabels = [
    'Nombre',
    'Zona o ciudad',
    'Imagen',
    'Intereses',
    'Descripción',
    'Plan',
    'Vista previa',
  ] as const;
  readonly groupStep = signal(1);
  readonly newGroupInterestOptions = signal<string[]>([]);
  newGroup: CreateGroupInput = this.emptyGroup();
  newInterestName = '';

  initialize(): void {
    void this.auth
      .restoreSession()
      .then(() => {
        if (this.isSuperusuario) this.eventListView.set('published');
        void this.loadPlanSettings();
        void this.loadEvents();
      })
      .catch((error: unknown) => {
        this.error.set(this.errorMessage(error));
        void this.loadEvents();
      });
  }

  addEventInterest(name: string): boolean {
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > 40) return false;
    const existing = [
      ...this.availableGroupInterests().map((item) => item.name),
      ...this.newEventInterestOptions(),
    ].find((item) => item.toLocaleLowerCase('es') === normalizedName.toLocaleLowerCase('es'));
    const interestName = existing ?? normalizedName;
    if (!existing) this.newEventInterestOptions.update((items) => [...items, interestName]);
    if (!this.newEvent.interests.includes(interestName)) this.toggleEventInterest(interestName);
    return true;
  }

  private resetEventOptions(): void {
    this.eventStep.set(1);
    this.newEventInterestOptions.set([]);
    this.eventAnyAge.set(false);
    this.eventMinimumAge = 18;
    this.eventMaximumAge = 100;
    this.eventIsFree.set(false);
  }

  get isAdmin(): boolean {
    return this.user()?.role === 'admin';
  }

  get isSuperusuario(): boolean {
    return this.user()?.superusuario === true;
  }

  async loadPlanSettings(): Promise<void> {
    try {
      const settings = await firstValueFrom(this.groupsApi.planSettings());
      this.planSettings.set({
        standardPrice: Number.isFinite(settings.standardPrice) ? settings.standardPrice : 2,
        standardFreeEvents: Number.isInteger(settings.standardFreeEvents)
          ? settings.standardFreeEvents
          : 3,
        proMonthlyPrice: Number.isFinite(settings.proMonthlyPrice) ? settings.proMonthlyPrice : 15,
      });
    } catch {
      // Los valores predeterminados se mantienen si el API no está disponible.
    }
  }

  async updatePlanSettings(settings: PlanSettings): Promise<void> {
    this.error.set('');
    try {
      this.planSettings.set(await firstValueFrom(this.groupsApi.updatePlanSettings(settings)));
      this.notice.set('Condiciones de los planes actualizadas.');
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  get canCreateEventInSelectedGroup(): boolean {
    const groupId = this.selectedGroup()?._id;
    return !!groupId && (this.isAdmin || this.myGroups().some((group) => group._id === groupId));
  }

  openAuth(mode: 'login' | 'register'): void {
    this.authMode.set(mode);
    this.credentials = { name: '', email: '', password: '' };
    this.error.set('');
    this.dialogOpen.set(true);
  }

  async submitAuth(): Promise<void> {
    this.error.set('');
    try {
      if (this.authMode() === 'register') {
        await this.auth.register(this.credentials);
      } else {
        await this.auth.login(this.credentials.email, this.credentials.password);
      }
      this.adminView.set(false);
      this.dialogOpen.set(false);
      this.notice.set(`¡Hola, ${this.user()?.name}!`);
      await this.loadEvents();
      if (this.isAdmin) void this.router.navigate(['/administracion']);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  async logout(): Promise<void> {
    this.auth.logout();
    this.adminView.set(false);
    this.groupJoinNotice.set('');
    this.notice.set('Has cerrado sesión.');
    await this.loadEvents();
  }

  async loadEvents(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const events =
        this.isAdmin && this.adminView()
          ? await firstValueFrom(this.eventsApi.adminEvents())
          : await firstValueFrom(this.eventsApi.publicEvents(this.activeSection()));
      this.events.set(events);
      this.allGroups.set(await firstValueFrom(this.groupsApi.allGroups()));
      const interests =
        this.isAdmin && this.adminView()
          ? this.groupsApi.adminInterests()
          : this.groupsApi.allInterests();
      this.availableGroupInterests.set(await firstValueFrom(interests));
      if (this.user()) {
        const myGroups = await firstValueFrom(this.groupsApi.myGroups());
        this.myGroups.set(myGroups);
        this.interestGroups.set(await firstValueFrom(this.groupsApi.interestGroups()));
        this.groups.set(
          this.isAdmin ? await firstValueFrom(this.groupsApi.adminGroups()) : myGroups,
        );
        const myEvents = await firstValueFrom(this.eventsApi.myEvents());
        this.myEvents.set(myEvents.created);
        this.enrolledEvents.set(myEvents.enrolled);
        if (this.eventListView() === 'joined' && this.myEnrolledEvents().length === 0) {
          this.eventListView.set('published');
        }
      } else {
        this.myGroups.set([]);
        this.interestGroups.set([]);
        this.groups.set([]);
        this.myEvents.set([]);
        this.enrolledEvents.set([]);
      }
      this.groupsNeedRefresh.set(false);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async enroll(event: EventItem, joinGroup = false): Promise<boolean> {
    if (!this.user()) {
      this.openAuth('login');
      return false;
    }
    this.error.set('');
    this.notice.set('');
    try {
      const result = await firstValueFrom(this.eventsApi.enroll(event._id, joinGroup));
      this.notice.set(result.message);
      await this.loadEvents();
      return true;
    } catch (error) {
      this.error.set(this.errorMessage(error));
      return false;
    }
  }

  async unenroll(event: EventItem): Promise<boolean> {
    if (!this.user()) {
      this.openAuth('login');
      return false;
    }
    if (!event.isEnrolled || this.unenrollingEventId()) return false;

    this.unenrollingEventId.set(event._id);
    this.error.set('');
    this.notice.set('');
    try {
      const result = await firstValueFrom(this.eventsApi.unenroll(event._id));
      this.notice.set(result.message);
      await this.loadEvents();
      return true;
    } catch (error) {
      this.error.set(this.errorMessage(error));
      return false;
    } finally {
      this.unenrollingEventId.set(null);
    }
  }

  async joinGroup(group: GroupItem): Promise<void> {
    if (!this.user()) {
      this.openAuth('login');
      return;
    }
    this.error.set('');
    this.notice.set('');
    this.groupJoinNotice.set('');
    try {
      await firstValueFrom(this.groupsApi.joinGroup(group._id));
      this.groupJoinNotice.set(`Te has unido al grupo «${group.name}».`);
      this.interestGroups.update((groups) =>
        groups.some((item) => item._id === group._id) ? groups : [...groups, group],
      );
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  async createInterest(name: string): Promise<void> {
    this.error.set('');
    this.notice.set('');
    try {
      const interest = await firstValueFrom(this.groupsApi.createInterest(name));
      this.availableGroupInterests.update((interests) =>
        [...interests, interest].sort((first, second) =>
          first.name.localeCompare(second.name, 'es'),
        ),
      );
      this.newInterestName = '';
      this.notice.set(`Interés «${interest.name}» añadido.`);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  addGroupInterest(name: string): void {
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > 40) return;
    const existingName = [
      ...this.availableGroupInterests().map((item) => item.name),
      ...this.newGroupInterestOptions(),
    ].find((item) => item.toLocaleLowerCase('es') === normalizedName.toLocaleLowerCase('es'));
    const interestName = existingName ?? normalizedName;
    if (!existingName) this.newGroupInterestOptions.update((items) => [...items, interestName]);
    if (!this.newGroup.interests.includes(interestName)) this.toggleGroupInterest(interestName);
  }

  setEventListView(view: 'published' | 'joined'): void {
    this.eventListView.set(view);
    this.searchTerm.set('');
  }

  async submitEvent(): Promise<EventItem | null> {
    this.error.set('');
    this.notice.set('');
    if (!this.newEvent.description.trim()) {
      this.eventStep.set(10);
      this.error.set('La descripción es obligatoria.');
      return null;
    }
    try {
      const editingId = this.editingId();
      let savedEvent: EventItem;
      if (editingId) {
        savedEvent = await firstValueFrom(
          this.eventsApi.update(editingId, this.newEvent, this.isAdmin),
        );
        this.notice.set('Cambios guardados.');
      } else {
        savedEvent = await firstValueFrom(this.eventsApi.create(this.newEvent, this.isAdmin));
        this.notice.set(
          this.isAdmin
            ? 'La experiencia ya está publicada en SinglesPlans.'
            : 'Tu evento se ha enviado y está pendiente de aprobación por SinglesPlans.',
        );
      }
      this.createOpen.set(false);
      this.editingId.set(null);
      this.newEvent = this.emptyEvent();
      this.newEventInterestOptions.set([]);
      this.eventStep.set(1);
      await this.loadEvents();
      if (!editingId && this.isSuperusuario) this.eventListView.set('published');
      return savedEvent;
    } catch (error) {
      this.error.set(this.errorMessage(error));
      return null;
    }
  }

  openCreateEvent(): void {
    if (!this.user()) {
      this.openAuth('register');
      return;
    }
    this.error.set('');
    if (this.groups().length === 0) {
      this.openCreateGroup();
      return;
    }
    this.editingId.set(null);
    this.newEvent = { ...this.emptyEvent(), groupId: this.groups()[0]._id };
    this.resetEventOptions();
    this.createOpen.set(true);
  }

  openCreateGroup(): void {
    if (!this.user()) {
      this.openAuth('register');
      return;
    }
    this.error.set('');
    this.newGroup = this.emptyGroup();
    this.newGroupInterestOptions.set([]);
    this.groupStep.set(1);
    this.groupOpen.set(true);
  }

  nextGroupStep(): void {
    if (this.groupStep() === 1 && !this.newGroup.name.trim()) {
      this.error.set('Escribe el nombre del grupo para continuar.');
      return;
    }
    this.error.set('');
    this.groupStep.update((step) => Math.min(step + 1, this.groupStepLabels.length));
  }

  previousGroupStep(): void {
    this.error.set('');
    this.groupStep.update((step) => Math.max(step - 1, 1));
  }

  skipGroupStep(): void {
    if (this.groupStep() === 2) this.newGroup.city = '';
    if (this.groupStep() === 3) this.newGroup.imageUrl = '';
    if (this.groupStep() === 4) this.newGroup.interests = [];
    this.nextGroupStep();
  }

  toggleGroupInterest(interest: string): void {
    this.newGroup.interests = this.newGroup.interests.includes(interest)
      ? this.newGroup.interests.filter((item) => item !== interest)
      : [...this.newGroup.interests, interest];
  }

  onGroupImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      this.error.set('Selecciona una imagen JPG, PNG o WebP de máximo 2 MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        this.error.set('No se pudo leer la imagen seleccionada.');
        return;
      }
      this.newGroup.imageUrl = reader.result;
      this.error.set('');
    };
    reader.onerror = () => this.error.set('No se pudo leer la imagen seleccionada.');
    reader.readAsDataURL(file);
  }

  openGroupDetails(group: GroupItem): void {
    this.selectedGroup.set(group);
    this.error.set('');
    this.notice.set('');
    void this.router.navigate(['/grupos', group._id]);
  }

  closeGroupDetails(): void {
    this.selectedGroup.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async submitGroup(): Promise<GroupItem | null> {
    this.error.set('');
    if (!this.newGroup.name.trim()) {
      this.groupStep.set(1);
      this.error.set('El nombre del grupo es obligatorio.');
      return null;
    }
    if (!this.newGroup.description.trim()) {
      this.error.set('La descripción es obligatoria.');
      return null;
    }
    try {
      const group = await firstValueFrom(
        this.groupsApi.createGroup({
          ...this.newGroup,
          name: this.newGroup.name.trim(),
          description: this.newGroup.description.trim(),
          city: this.newGroup.city.trim(),
        }),
      );
      this.auth.setSuperusuario(true);
      this.eventListView.set('published');
      this.groups.update((groups) => [...groups, group]);
      this.myGroups.update((groups) => [...groups, group]);
      this.allGroups.update((groups) => [...groups, group]);
      this.groupsNeedRefresh.set(true);
      this.groupOpen.set(false);
      this.notice.set(`Grupo «${group.name}» creado. Añade ahora un evento para el grupo.`);
      this.editingId.set(null);
      this.newEvent = { ...this.emptyEvent(), groupId: group._id };
      this.resetEventOptions();
      return group;
    } catch (error) {
      this.error.set(this.errorMessage(error));
      return null;
    }
  }

  openEditEvent(event: EventItem): void {
    this.prepareEventEdit(event);
    void this.router.navigate(['/eventos/crear'], { queryParams: { editar: event._id } });
  }

  prepareEventEdit(event: EventItem): void {
    this.error.set('');
    this.editingId.set(event._id);
    this.newEvent = {
      title: event.title,
      description: event.description,
      type: event.type,
      location: event.location,
      meetingPoint: event.meetingPoint ?? this.emptyMeetingPoint(),
      interests: event.interests ?? [],
      ageRange: event.ageRange ?? null,
      timeOfDay: event.timeOfDay ?? 'afternoon',
      startsAt: this.toLocalInput(new Date(event.startsAt)),
      endsAt: this.toLocalInput(new Date(event.endsAt)),
      price: event.price,
      capacity: event.capacity,
      imageUrl: event.imageUrl ?? '',
      groupId: event.group?._id ?? '',
    };
    this.eventAnyAge.set(!event.ageRange);
    this.eventMinimumAge = event.ageRange?.min ?? 18;
    this.eventMaximumAge = event.ageRange?.max ?? 100;
    this.eventIsFree.set(event.price === 0);
    this.eventStep.set(1);
    this.newEventInterestOptions.set(
      (event.interests ?? []).filter(
        (interest) =>
          !this.availableGroupInterests().some((available) => available.name === interest),
      ),
    );
    this.createOpen.set(true);
  }

  createEventInGroup(group: GroupItem): void {
    this.createEventForGroupId(group._id);
  }

  createEventForGroupId(groupId: string): void {
    this.error.set('');
    this.editingId.set(null);
    this.newEvent = { ...this.emptyEvent(), groupId, type: 'event' };
    this.resetEventOptions();
    this.createOpen.set(true);
  }

  nextEventStep(): void {
    const step = this.eventStep();
    const valid =
      step === 1
        ? !!this.newEvent.title.trim()
        : step === 2
          ? !!this.newEvent.location.trim()
          : step === 3
            ? !!this.newEvent.meetingPoint.name.trim() &&
              !!this.newEvent.meetingPoint.address.trim()
            : step === 6
              ? this.eventAnyAge() ||
                (Number.isInteger(this.eventMinimumAge) &&
                  Number.isInteger(this.eventMaximumAge) &&
                  this.eventMinimumAge >= 18 &&
                  this.eventMaximumAge <= 100 &&
                  this.eventMinimumAge <= this.eventMaximumAge)
              : step === 7
                ? this.validEventDates()
                : step === 8
                  ? Number.isInteger(this.newEvent.capacity) &&
                    this.newEvent.capacity > 0 &&
                    (this.eventIsFree() ||
                      (Number.isFinite(this.newEvent.price) && this.newEvent.price >= 0))
                  : true;
    if (!valid) {
      this.error.set(this.eventStepError(step));
      return;
    }
    this.error.set('');
    if (step === 6)
      this.newEvent.ageRange = this.eventAnyAge()
        ? null
        : { min: this.eventMinimumAge, max: this.eventMaximumAge };
    if (step === 8 && this.eventIsFree()) this.newEvent.price = 0;
    this.eventStep.update((current) => Math.min(current + 1, this.eventStepLabels.length));
  }

  previousEventStep(): void {
    this.error.set('');
    this.eventStep.update((step) => Math.max(step - 1, 1));
  }

  skipEventStep(): void {
    if (this.eventStep() === 4) this.newEvent.imageUrl = '';
    if (this.eventStep() === 5) this.newEvent.interests = [];
    this.nextEventStep();
  }

  toggleEventInterest(interest: string): void {
    this.newEvent.interests = this.newEvent.interests.includes(interest)
      ? this.newEvent.interests.filter((item) => item !== interest)
      : [...this.newEvent.interests, interest];
  }

  setEventMeetingPoint(place: EventMeetingPoint): void {
    this.newEvent.meetingPoint = place;
    this.error.set('');
  }

  setManualEventMeetingPoint(name: string): void {
    this.newEvent.meetingPoint = {
      name,
      address: name ? `${name}, ${this.newEvent.location}` : '',
      placeId: '',
      latitude: null,
      longitude: null,
    };
  }

  setEventPlaceError(message: string): void {
    this.error.set(message);
  }

  setEventTimeOfDay(timeOfDay: EventTimeOfDay): void {
    this.newEvent.timeOfDay = timeOfDay;
    const startDate = this.newEvent.startsAt.slice(0, 10);
    const endDate = this.newEvent.endsAt.slice(0, 10) || startDate;
    const times = {
      afternoon: ['16:00', '20:00'],
      night: ['20:00', '23:59'],
      'all-day': ['00:00', '23:59'],
    } satisfies Record<EventTimeOfDay, [string, string]>;
    this.newEvent.startsAt = `${startDate}T${times[timeOfDay][0]}`;
    this.newEvent.endsAt = `${endDate}T${times[timeOfDay][1]}`;
  }

  toggleEventAnyAge(anyAge: boolean): void {
    this.eventAnyAge.set(anyAge);
    if (anyAge) this.newEvent.ageRange = null;
  }

  toggleEventFree(isFree: boolean): void {
    this.eventIsFree.set(isFree);
    if (isFree) this.newEvent.price = 0;
  }

  onEventImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      this.error.set('Selecciona una imagen JPG, PNG o WebP de máximo 2 MB.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        this.error.set('No se pudo leer la imagen seleccionada.');
        return;
      }
      this.newEvent.imageUrl = reader.result;
      this.error.set('');
    };
    reader.onerror = () => this.error.set('No se pudo leer la imagen seleccionada.');
    reader.readAsDataURL(file);
  }

  async setStatus(event: EventItem, status: 'published' | 'rejected'): Promise<void> {
    this.error.set('');
    try {
      await firstValueFrom(this.eventsApi.update(event._id, { status }));
      this.notice.set(status === 'published' ? 'Plan publicado.' : 'Propuesta rechazada.');
      await this.loadEvents();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  async deleteEvent(event: EventItem): Promise<void> {
    if (!window.confirm(`¿Eliminar «${event.title}» y sus reservas?`)) return;
    this.error.set('');
    try {
      await firstValueFrom(this.eventsApi.remove(event._id));
      this.notice.set('Plan eliminado.');
      await this.loadEvents();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  switchView(admin: boolean): void {
    this.selectedGroup.set(null);
    this.adminView.set(admin && this.isAdmin);
    this.notice.set('');
    void this.loadEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  switchSection(section: 'events' | 'trips'): void {
    this.selectedGroup.set(null);
    this.activeSection.set(section);
    this.adminView.set(false);
    this.searchTerm.set('');
    this.notice.set('');
    void this.loadEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollToPlans(): void {
    document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' });
  }

  updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  clearFilters(): void {
    this.searchTerm.set('');
  }

  private emptyEvent() {
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(16, 0, 0, 0);
    const following = new Date(tomorrow);
    following.setHours(20, 0, 0, 0);
    return {
      title: '',
      description: '',
      type: 'event' as const,
      location: '',
      meetingPoint: this.emptyMeetingPoint(),
      interests: [],
      ageRange: null,
      timeOfDay: 'afternoon' as const,
      startsAt: this.toLocalInput(tomorrow),
      endsAt: this.toLocalInput(following),
      price: 0,
      capacity: 10,
      imageUrl: '',
      groupId: '',
    };
  }

  private emptyMeetingPoint(): EventMeetingPoint {
    return { name: '', address: '', placeId: '', latitude: null, longitude: null };
  }

  private validEventDates(): boolean {
    const startsAt = new Date(this.newEvent.startsAt);
    const endsAt = new Date(this.newEvent.endsAt);
    return (
      Number.isFinite(startsAt.getTime()) &&
      Number.isFinite(endsAt.getTime()) &&
      startsAt.getTime() > Date.now() &&
      endsAt.getTime() >= startsAt.getTime()
    );
  }

  private eventStepError(step: number): string {
    const messages: Record<number, string> = {
      1: 'El nombre del evento es obligatorio.',
      2: 'La zona o ciudad es obligatoria.',
      3: 'Selecciona un punto de encuentro válido.',
      6: 'Indica un rango de edad válido entre 18 y 100 años, o elige cualquier edad.',
      7: 'Selecciona una fecha futura y comprueba que la fecha de fin no sea anterior.',
      8: 'Indica al menos una plaza y un precio válido.',
    };
    return messages[step] ?? 'Revisa los datos de este paso.';
  }

  private emptyGroup(): CreateGroupInput {
    return { name: '', description: '', city: '', imageUrl: '', interests: [], plan: 'standard' };
  }

  private toLocalInput(date: Date): string {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  }

  private errorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const body = error['error'];
      if (
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        typeof body['message'] === 'string'
      ) {
        return body['message'];
      }
    }
    return 'No se pudo completar la operación. Comprueba que la API está disponible.';
  }
}
