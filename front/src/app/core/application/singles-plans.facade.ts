import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { EventsService } from '../../features/events/data-access/events.service';
import { GroupsService } from '../../features/groups/data-access/groups.service';
import type { EventItem, EventType } from '../../features/events/models/event.model';
import type { GroupItem } from '../../features/groups/models/group.model';

@Injectable({ providedIn: 'root' })
export class SinglesPlansFacade {
  private readonly auth = inject(AuthService);
  private readonly eventsApi = inject(EventsService);
  private readonly groupsApi = inject(GroupsService);

  readonly events = signal<EventItem[]>([]);
  readonly groups = signal<GroupItem[]>([]);
  readonly user = this.auth.user;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notice = signal('');
  readonly dialogOpen = signal(false);
  readonly createOpen = signal(false);
  readonly groupOpen = signal(false);
  readonly selectedGroup = signal<GroupItem | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly authMode = signal<'login' | 'register'>('login');
  readonly adminView = signal(false);
  readonly activeSection = signal<'events' | 'trips'>('events');
  readonly searchTerm = signal('');
  readonly pendingCount = computed(() => this.events().filter((event) => event.status === 'pending').length);
  readonly publishedCount = computed(() => this.events().filter((event) => event.status === 'published').length);
  readonly filteredEvents = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase('es');
    return this.events().filter((event) => {
      const searchableText = `${event.title} ${event.description} ${event.location}`.toLocaleLowerCase('es');
      return !query || searchableText.includes(query);
    });
  });

  credentials = { name: '', email: '', password: '' };
  newEvent: {
    title: string;
    description: string;
    type: EventType;
    location: string;
    startsAt: string;
    endsAt: string;
    price: number;
    capacity: number;
    imageUrl: string;
    groupId: string;
  } = this.emptyEvent();
  newGroup = { name: '', description: '', city: '', minAge: null as number | null, maxAge: null as number | null, imageUrl: '' };

  initialize(): void {
    void this.auth.restoreSession().then(() => {
      if (this.user()?.role === 'admin') this.adminView.set(true);
      void this.loadEvents();
    }).catch((error: unknown) => {
      this.error.set(this.errorMessage(error));
      void this.loadEvents();
    });
  }

  get isAdmin(): boolean {
    return this.user()?.role === 'admin';
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
      this.adminView.set(this.isAdmin);
      this.dialogOpen.set(false);
      this.notice.set(`¡Hola, ${this.user()?.name}!`);
      await this.loadEvents();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  async logout(): Promise<void> {
    this.auth.logout();
    this.adminView.set(false);
    this.notice.set('Has cerrado sesión.');
    await this.loadEvents();
  }

  async loadEvents(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const events = this.isAdmin && this.adminView()
        ? await firstValueFrom(this.eventsApi.adminEvents())
        : await firstValueFrom(this.eventsApi.publicEvents(this.activeSection()));
      this.events.set(events);
      if (this.user()) {
        this.groups.set(await firstValueFrom(this.isAdmin ? this.groupsApi.adminGroups() : this.groupsApi.myGroups()));
      } else {
        this.groups.set([]);
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async enroll(event: EventItem): Promise<void> {
    if (!this.user()) {
      this.openAuth('login');
      return;
    }
    this.error.set('');
    this.notice.set('');
    try {
      const result = await firstValueFrom(this.eventsApi.enroll(event._id));
      this.notice.set(result.message);
      await this.loadEvents();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  async submitEvent(): Promise<void> {
    this.error.set('');
    this.notice.set('');
    try {
      const editingId = this.editingId();
      if (editingId) {
        await firstValueFrom(this.eventsApi.update(editingId, this.newEvent));
        this.notice.set('Cambios guardados.');
      } else {
        await firstValueFrom(this.eventsApi.create(this.newEvent, this.isAdmin));
        this.notice.set(this.isAdmin
          ? 'La experiencia ya está publicada en SinglesPlans.'
          : 'Tu evento se ha enviado y está pendiente de aprobación por SinglesPlans.');
      }
      this.createOpen.set(false);
      this.editingId.set(null);
      this.newEvent = this.emptyEvent();
      await this.loadEvents();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  openCreateEvent(): void {
    if (!this.isAdmin) return;
    this.error.set('');
    if (this.groups().length === 0) {
      this.openCreateGroup();
      return;
    }
    this.editingId.set(null);
    this.newEvent = { ...this.emptyEvent(), groupId: this.groups()[0]._id };
    this.createOpen.set(true);
  }

  openCreateGroup(): void {
    if (!this.user()) {
      this.openAuth('register');
      return;
    }
    this.error.set('');
    this.newGroup = { name: '', description: '', city: '', minAge: null, maxAge: null, imageUrl: '' };
    this.groupOpen.set(true);
  }

  onGroupImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeGroupDetails(): void {
    this.selectedGroup.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async submitGroup(): Promise<void> {
    this.error.set('');
    try {
      const group = await firstValueFrom(this.groupsApi.createGroup(this.newGroup));
      this.groups.update((groups) => [...groups, group]);
      this.groupOpen.set(false);
      this.notice.set(`Grupo «${group.name}» creado. Añade ahora un evento para el grupo.`);
      this.editingId.set(null);
      this.newEvent = { ...this.emptyEvent(), groupId: group._id };
      this.createOpen.set(true);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    }
  }

  openEditEvent(event: EventItem): void {
    this.error.set('');
    this.editingId.set(event._id);
    this.newEvent = {
      title: event.title,
      description: event.description,
      type: event.type,
      location: event.location,
      startsAt: this.toLocalInput(new Date(event.startsAt)),
      endsAt: this.toLocalInput(new Date(event.endsAt)),
      price: event.price,
      capacity: event.capacity,
      imageUrl: event.imageUrl ?? '',
      groupId: event.group?._id ?? ''
    };
    this.createOpen.set(true);
  }

  createEventInGroup(group: GroupItem): void {
    this.error.set('');
    this.editingId.set(null);
    this.newEvent = { ...this.emptyEvent(), groupId: group._id, type: 'event' };
    this.createOpen.set(true);
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
    const following = new Date(tomorrow.getTime() + 3 * 3600000);
    return {
      title: '',
      description: '',
      type: 'event' as EventType,
      location: '',
      startsAt: this.toLocalInput(tomorrow),
      endsAt: this.toLocalInput(following),
      price: 0,
      capacity: 10,
      imageUrl: '',
      groupId: ''
    };
  }

  private toLocalInput(date: Date): string {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  }

  private errorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const body = error['error'];
      if (typeof body === 'object' && body !== null && 'message' in body && typeof body['message'] === 'string') {
        return body['message'];
      }
    }
    return 'No se pudo completar la operación. Comprueba que la API está disponible.';
  }
}
