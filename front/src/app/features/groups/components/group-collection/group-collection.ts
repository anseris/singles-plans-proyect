import { Component, computed, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import type { GroupItem } from '../../models/group.model';

@Component({
  selector: 'app-group-collection',
  imports: [ButtonModule],
  templateUrl: './group-collection.html',
  styleUrl: './group-collection.scss'
})
export class GroupCollection {
  readonly myGroups = input.required<GroupItem[]>();
  readonly allGroups = input.required<GroupItem[]>();
  readonly authenticated = input.required<boolean>();
  readonly canCreateAnyEvent = input(false);
  readonly activeTab = signal<'mine' | 'all' | 'interests'>('mine');
  readonly showMineTab = computed(() => this.authenticated() && this.myGroups().length > 0);
  readonly visibleGroups = computed(() => {
    if (this.activeTab() === 'mine' && this.showMineTab()) return this.myGroups();
    if (this.activeTab() === 'interests' && this.authenticated()) return this.interestGroups();
    return this.allGroups();
  });
  readonly interestGroups = input<GroupItem[]>([]);
  readonly createRequested = output<void>();
  readonly loginRequested = output<void>();
  readonly groupSelected = output<GroupItem>();
  readonly eventRequested = output<GroupItem>();
  readonly joinRequested = output<GroupItem>();

  isOwnGroup(group: GroupItem): boolean {
    return this.canCreateAnyEvent() || this.myGroups().some((ownGroup) => ownGroup._id === group._id);
  }

  isInterestGroup(group: GroupItem): boolean {
    return this.interestGroups().some((interestGroup) => interestGroup._id === group._id);
  }

  isActiveTab(tab: 'all' | 'interests'): boolean {
    if (tab === 'interests') return this.activeTab() === 'interests' && this.authenticated();
    return this.activeTab() === 'all' || (this.activeTab() === 'mine' && !this.showMineTab()) ||
      (this.activeTab() === 'interests' && !this.authenticated());
  }

  groupInitial(name: string): string {
    return name.trim().charAt(0).toLocaleUpperCase('es-ES') || '?';
  }
}
