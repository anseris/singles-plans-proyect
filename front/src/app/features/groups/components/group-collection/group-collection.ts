import { Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiButton } from '../../../../shared/design-system';
import type { GroupItem } from '../../models/group.model';

@Component({
  selector: 'app-group-collection',
  imports: [UiButton, RouterLink],
  templateUrl: './group-collection.html',
  styleUrl: './group-collection.scss'
})
export class GroupCollection {
  readonly myGroups = input.required<GroupItem[]>();
  readonly allGroups = input.required<GroupItem[]>();
  readonly authenticated = input.required<boolean>();
  readonly canCreateAnyEvent = input(false);
  readonly loading = input(false);
  readonly error = input('');
  readonly joinNotice = input('');
  readonly displayMode = input<'carousel' | 'all'>('carousel');
  readonly activeTab = signal<'mine' | 'managed'>('managed');
  readonly selectedTab = computed<'mine' | 'managed'>(() =>
    this.myGroups().length > 0 ? this.activeTab() : 'mine'
  );
  readonly showManagedTab = computed(() => this.myGroups().length > 0);
  readonly visibleGroups = computed(() => {
    if (this.displayMode() === 'all') return this.allGroups();
    if (!this.authenticated()) return [];
    return this.selectedTab() === 'managed' ? this.myGroups() : this.interestGroups();
  });
  readonly showCarouselControls = computed(
    () => this.displayMode() === 'carousel' && this.visibleGroups().length > 2
  );
  readonly interestGroups = input<GroupItem[]>([]);
  readonly carousel = viewChild<ElementRef<HTMLDivElement>>('groupCarousel');
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

  selectTab(tab: 'mine' | 'managed'): void {
    this.activeTab.set(tab);
    this.carousel()?.nativeElement.scrollTo({ left: 0, behavior: 'smooth' });
  }

  scrollGroups(direction: -1 | 1): void {
    const carousel = this.carousel()?.nativeElement;
    if (!carousel) return;
    carousel.scrollBy({ left: direction * carousel.clientWidth * 0.8, behavior: 'smooth' });
  }

  groupInitial(name: string): string {
    return name.trim().charAt(0).toLocaleUpperCase('es-ES') || '?';
  }
}
