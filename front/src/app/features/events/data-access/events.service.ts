import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { EventCreateInput, EventItem } from '../models/event.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);

  publicEvents(section: 'events' | 'trips'): Observable<EventItem[]> {
    const params = new HttpParams().set('section', section);
    return this.http.get<EventItem[]>('/api/events', { params });
  }

  adminEvents(): Observable<EventItem[]> {
    return this.http.get<EventItem[]>('/api/admin/events');
  }

  enroll(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`/api/events/${id}/enroll`, {});
  }

  create(
    event: EventCreateInput,
    isAdmin: boolean
  ): Observable<EventItem> {
    return this.http.post<EventItem>(isAdmin ? '/api/admin/events' : '/api/events', event);
  }

  update(id: string, update: Partial<EventItem>): Observable<EventItem> {
    return this.http.patch<EventItem>(`/api/admin/events/${id}`, update);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/events/${id}`);
  }
}
