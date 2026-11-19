import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type EventType = 'excursion' | 'trip' | 'event';
export type EventStatus = 'pending' | 'published' | 'rejected' | 'cancelled';

export interface EventItem {
  _id: string;
  title: string;
  description: string;
  type: EventType;
  location: string;
  startsAt: string;
  endsAt: string;
  price: number;
  capacity: number;
  imageUrl: string;
  status: EventStatus;
  enrolledCount?: number;
  createdBy?: { name: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);

  publicEvents(): Observable<EventItem[]> {
    return this.http.get<EventItem[]>('/api/events');
  }

  adminEvents(): Observable<EventItem[]> {
    return this.http.get<EventItem[]>('/api/admin/events');
  }

  enroll(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`/api/events/${id}/enroll`, {});
  }

  create(event: Omit<EventItem, '_id' | 'status' | 'enrolledCount' | 'createdBy'>): Observable<EventItem> {
    return this.http.post<EventItem>('/api/admin/events', event);
  }

  update(id: string, update: Partial<EventItem>): Observable<EventItem> {
    return this.http.patch<EventItem>(`/api/admin/events/${id}`, update);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/events/${id}`);
  }
}
