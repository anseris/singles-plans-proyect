import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import type { EventItem, EventStatus } from '../../../events/models/event.model';
import type { GroupItem } from '../../../groups/models/group.model';

@Component({
  selector: 'app-admin-dashboard',
  imports: [ButtonModule, TagModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboard {
  readonly events = input.required<EventItem[]>();
  readonly groups = input.required<GroupItem[]>();
  readonly loading = input.required<boolean>();
  readonly error = input.required<string>();
  readonly notice = input.required<string>();
  readonly pendingCount = input.required<number>();
  readonly publishedCount = input.required<number>();
  readonly publicViewRequested = output<void>();
  readonly groupCreationRequested = output<void>();
  readonly eventCreationRequested = output<void>();
  readonly statusChanged = output<{ event: EventItem; status: 'published' | 'rejected' }>();
  readonly editRequested = output<EventItem>();
  readonly deleteRequested = output<EventItem>();

  statusLabel(status: EventStatus): string {
    return { pending: 'Pendiente', published: 'Publicado', rejected: 'Rechazado', cancelled: 'Cancelado' }[status];
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));
  }
}
