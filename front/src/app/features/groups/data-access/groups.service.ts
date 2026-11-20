import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { CreateGroupInput, GroupItem } from '../models/group.model';

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private readonly http = inject(HttpClient);

  adminGroups(): Observable<GroupItem[]> {
    return this.http.get<GroupItem[]>('/api/admin/groups');
  }

  myGroups(): Observable<GroupItem[]> {
    return this.http.get<GroupItem[]>('/api/groups/mine');
  }

  createGroup(group: CreateGroupInput): Observable<GroupItem> {
    return this.http.post<GroupItem>('/api/groups', group);
  }
}
