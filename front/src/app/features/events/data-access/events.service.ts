import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { EventAttendee, EventCreateInput, EventDetails, EventItem } from '../models/event.model';

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

  myEvents(): Observable<{ created: EventItem[]; enrolled: EventItem[] }> {
    return this.http.get<{ created: EventItem[]; enrolled: EventItem[] }>('/api/events/mine');
  }

  eventDetails(id: string): Observable<EventDetails> {
    return this.http.get<EventDetails>(`/api/events/${id}/details`);
  }

  eventAttendees(id: string): Observable<EventAttendee[]> {
    return this.http.get<EventAttendee[]>(`/api/events/${id}/attendees`);
  }

  enroll(id: string, joinGroup = false): Observable<{ message: string; joinedGroup: boolean }> {
    return this.http.post<{ message: string; joinedGroup: boolean }>(`/api/events/${id}/enroll`, { joinGroup });
  }

  unenroll(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/events/${id}/enroll`);
  }

  create(
    event: EventCreateInput,
    isAdmin: boolean
  ): Observable<EventItem> {
    return this.http.post<EventItem>(isAdmin ? '/api/admin/events' : '/api/events', event);
  }

  update(id: string, update: Partial<EventItem>, isAdmin = true): Observable<EventItem> {
    return this.http.patch<EventItem>(`${isAdmin ? '/api/admin/events' : '/api/events'}/${id}`, update);
  }

  cancel(id: string, isAdmin = false): Observable<EventItem> {
    return isAdmin
      ? this.http.patch<EventItem>(`/api/admin/events/${id}`, { status: 'cancelled' })
      : this.http.post<EventItem>(`/api/events/${id}/cancel`, {});
  }

  remove(id: string, isAdmin = true): Observable<void> {
    return this.http.delete<void>(`${isAdmin ? '/api/admin/events' : '/api/events'}/${id}`);
  }
}
