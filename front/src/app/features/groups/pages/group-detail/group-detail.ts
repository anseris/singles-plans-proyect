import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import type { GroupDetails, GroupItem } from '../../models/group.model';
import { SinglesPlansFacade } from '../../../../core/application/singles-plans.facade';
import { GroupsService } from '../../data-access/groups.service';
import { EventCard } from '../../../events/components/event-card/event-card';

@Component({
  selector: 'app-group-detail',
  imports: [ButtonModule, RouterLink, EventCard],
  templateUrl: './group-detail.html',
  styleUrl: './group-detail.scss'
})
export class GroupDetail {
  readonly group = signal<GroupItem | null>(null);
  readonly canCreateEvent = signal(false);
  readonly eventsTab = signal<'upcoming' | 'past'>('upcoming');
  readonly details = signal<GroupDetails | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly groupsApi = inject(GroupsService);
  readonly vm = inject(SinglesPlansFacade);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.error.set('No se encontró el grupo.');
      return;
    }
    try {
      const details = await firstValueFrom(this.groupsApi.groupDetails(id));
      this.details.set(details);
      this.group.set(details.group);
      this.canCreateEvent.set(
        this.vm.isAdmin ||
        this.vm.user()?.id === details.createdById ||
        this.vm.myGroups().some((group) => group._id === details.group._id)
      );
    } catch {
      this.error.set('No se pudieron cargar los detalles del grupo. Inténtalo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  createEvent(group: GroupItem): void {
    void this.router.navigate(['/eventos/crear'], { queryParams: { grupo: group._id } });
  }

}
