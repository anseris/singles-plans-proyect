import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventsPage } from '../events-page/events-page';
import { SinglesPlansFacade } from '../../../../core/application/singles-plans.facade';

@Component({
  selector: 'app-events-list',
  imports: [EventsPage],
  templateUrl: './events-list.html',
})
export class EventsList {
  readonly vm = inject(SinglesPlansFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const section = this.route.snapshot.data['section'] as 'events' | 'trips';
    if (this.vm.activeSection() !== section) this.vm.switchSection(section);
    else if (this.vm.groupsNeedRefresh()) void this.vm.loadEvents();
  }

  openCreateGroup(): void {
    void this.router.navigate(['/grupos/crear']);
  }

  openCreateEvent(groupId?: string): void {
    void this.router.navigate(['/eventos/crear'], { queryParams: groupId ? { grupo: groupId } : undefined });
  }
}
