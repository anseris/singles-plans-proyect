import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { PublicUserProfile } from '../models/public-user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  userById(id: string): Observable<PublicUserProfile> {
    return this.http.get<PublicUserProfile>(`/api/users/${encodeURIComponent(id)}`);
  }
}
