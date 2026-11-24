import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { CreateGroupInput, GroupDetails, GroupItem, InterestItem, PlanSettings } from '../models/group.model';

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private readonly http = inject(HttpClient);

  allGroups(): Observable<GroupItem[]> {
    return this.http.get<GroupItem[]>('/api/groups');
  }

  groupDetails(id: string): Observable<GroupDetails> {
    return this.http.get<GroupDetails>(`/api/groups/${id}/details`);
  }

  adminGroups(): Observable<GroupItem[]> {
    return this.http.get<GroupItem[]>('/api/admin/groups');
  }

  allInterests(): Observable<InterestItem[]> {
    return this.http.get<InterestItem[]>('/api/interests');
  }

  adminInterests(): Observable<InterestItem[]> {
    return this.http.get<InterestItem[]>('/api/admin/interests');
  }

  createInterest(name: string): Observable<InterestItem> {
    return this.http.post<InterestItem>('/api/admin/interests', { name });
  }

  myGroups(): Observable<GroupItem[]> {
    return this.http.get<GroupItem[]>('/api/groups/mine');
  }

  interestGroups(): Observable<GroupItem[]> {
    return this.http.get<GroupItem[]>('/api/groups/interests');
  }

  joinGroup(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`/api/groups/${id}/join`, {});
  }

  createGroup(group: CreateGroupInput): Observable<GroupItem> {
    return this.http.post<GroupItem>('/api/groups', group);
  }

  planSettings(): Observable<PlanSettings> {
    return this.http.get<PlanSettings>('/api/groups/plans');
  }

  adminPlanSettings(): Observable<PlanSettings> {
    return this.http.get<PlanSettings>('/api/admin/plans');
  }

  updatePlanSettings(settings: PlanSettings): Observable<PlanSettings> {
    return this.http.put<PlanSettings>('/api/admin/plans', settings);
  }
}
