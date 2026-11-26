import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminDashboard } from '../admin-dashboard/admin-dashboard';
import { SinglesPlansFacade } from '../../../../core/application/singles-plans.facade';
import type { EventItem } from '../../../events/models/event.model';

@Component({
  selector: 'app-admin-page',
  imports: [AdminDashboard],
  templateUrl: './admin-page.html',
})
export class AdminPage {
  readonly vm = inject(SinglesPlansFacade);
  private readonly router = inject(Router);
  readonly ready = signal(false);

  async ngOnInit(): Promise<void> {
    const allowed = await this.vm.enterAdminView();
    if (!allowed) {
      await this.router.navigate(['/eventos']);
      return;
    }
    this.ready.set(true);
  }

  showPublicView(): void {
    this.vm.switchView(false);
  }

  createGroup(): void {
    void this.router.navigate(['/grupos/crear']);
  }

  createEvent(): void {
    if (this.vm.groups().length === 0) {
      this.createGroup();
      return;
    }
    this.vm.openCreateEvent();
    void this.router.navigate(['/eventos/crear']);
  }

  createInterest(name: string): void {
    void this.vm.createInterest(name);
  }

  updateStatus(event: EventItem, status: 'published' | 'rejected'): void {
    void this.vm.setStatus(event, status);
  }

  editEvent(event: EventItem): void {
    this.vm.openEditEvent(event);
  }

  deleteEvent(event: EventItem): void {
    void this.vm.deleteEvent(event);
  }
}
