import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import type { EventItem, EventStatus } from '../../../events/models/event.model';
import type { GroupItem, InterestItem } from '../../../groups/models/group.model';
import { SinglesPlansFacade } from '../../../../core/application/singles-plans.facade';

@Component({
  selector: 'app-admin-dashboard',
  imports: [FormsModule, ButtonModule, InputTextModule, TagModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboard {
  readonly vm = inject(SinglesPlansFacade);
  readonly events = input.required<EventItem[]>();
  readonly groups = input.required<GroupItem[]>();
  readonly interests = input.required<InterestItem[]>();
  readonly loading = input.required<boolean>();
  readonly error = input.required<string>();
  readonly notice = input.required<string>();
  readonly pendingCount = input.required<number>();
  readonly publishedCount = input.required<number>();
  readonly publicViewRequested = output<void>();
  readonly groupCreationRequested = output<void>();
  readonly interestCreateRequested = output<string>();
  readonly eventCreationRequested = output<void>();
  readonly statusChanged = output<{ event: EventItem; status: 'published' | 'rejected' }>();
  readonly editRequested = output<EventItem>();
  readonly deleteRequested = output<EventItem>();
  interestDraft = '';

  ngOnInit(): void {
    void this.vm.loadPlanSettings();
  }

  savePlanSettings(): void {
    void this.vm.updatePlanSettings(this.vm.planSettings());
  }

  updateStandardPrice(value: number | string): void {
    this.vm.planSettings.update((settings) => ({ ...settings, standardPrice: Number(value) }));
  }

  updateStandardFreeEvents(value: number | string): void {
    this.vm.planSettings.update((settings) => ({ ...settings, standardFreeEvents: Number(value) }));
  }

  updateProMonthlyPrice(value: number | string): void {
    this.vm.planSettings.update((settings) => ({ ...settings, proMonthlyPrice: Number(value) }));
  }

  createInterest(): void {
    const name = this.interestDraft.trim();
    if (!name) return;
    this.interestCreateRequested.emit(name);
    this.interestDraft = '';
  }

  statusLabel(status: EventStatus): string {
    return { pending: 'Pendiente', published: 'Publicado', rejected: 'Rechazado', cancelled: 'Cancelado' }[status];
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));
  }
}
