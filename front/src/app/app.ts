import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { AuthService } from './auth.service';
import { EventsService, type EventItem, type EventType } from './events.service';

@Component({
  selector: 'app-root',
  imports: [CurrencyPipe, DatePipe, FormsModule, ButtonModule, DialogModule, InputTextModule, TagModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly eventsApi = inject(EventsService);

  readonly events = signal<EventItem[]>([]);
  readonly user = this.auth.user;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notice = signal('');
  readonly dialogOpen = signal(false);
  readonly createOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly authMode = signal<'login' | 'register'>('login');
  readonly adminView = signal(false);
  readonly activeCategory = signal<'all' | EventType>('all');
  readonly searchTerm = signal('');
  readonly pendingCount = computed(() => this.events().filter((event) => event.status === 'pending').length);
  readonly publishedCount = computed(() => this.events().filter((event) => event.status === 'published').length);
  readonly filteredEvents = computed(() => {
    const category = this.activeCategory();
    const query = this.searchTerm().trim().toLocaleLowerCase('es');
    return this.events().filter((event) => {
      const matchesCategory = category === 'all' || event.type === category;
      const searchableText = `${event.title} ${event.description} ${event.location}`.toLocaleLowerCase('es');
      return matchesCategory && (!query || searchableText.includes(query));
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
  } = this.emptyEvent();

  ngOnInit(): void {
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
        : await firstValueFrom(this.eventsApi.publicEvents());
      this.events.set(events);
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
        await firstValueFrom(this.eventsApi.create(this.newEvent));
        this.notice.set('La experiencia ya está publicada en SinglesPlans.');
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
    this.editingId.set(null);
    this.newEvent = this.emptyEvent();
    this.createOpen.set(true);
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
      imageUrl: event.imageUrl ?? ''
    };
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
    this.adminView.set(admin && this.isAdmin);
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

  setCategory(category: 'all' | EventType): void {
    this.activeCategory.set(category);
  }

  clearFilters(): void {
    this.activeCategory.set('all');
    this.searchTerm.set('');
  }

  typeLabel(type: EventType): string {
    return { excursion: 'Excursión', trip: 'Viaje', event: 'Evento' }[type];
  }

  statusLabel(status: EventItem['status']): string {
    return { pending: 'Pendiente', published: 'Publicado', rejected: 'Rechazado', cancelled: 'Cancelado' }[status];
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));
  }

  remaining(event: EventItem): number {
    return Math.max(event.capacity - (event.enrolledCount ?? 0), 0);
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
      imageUrl: ''
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
