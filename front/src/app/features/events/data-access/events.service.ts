import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { EventCreateInput, EventDetails, EventItem } from '../models/event.model';

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

  myEvents(): Observable<{ created: EventItem[]; enrollments: unknown[] }> {
    return this.http.get<{ created: EventItem[]; enrollments: unknown[] }>('/api/events/mine');
  }

  eventDetails(id: string): Observable<EventDetails> {
    return this.http.get<EventDetails>(`/api/events/${id}/details`);
  }

  enroll(id: string, joinGroup = false): Observable<{ message: string; joinedGroup: boolean }> {
    return this.http.post<{ message: string; joinedGroup: boolean }>(`/api/events/${id}/enroll`, { joinGroup });
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
