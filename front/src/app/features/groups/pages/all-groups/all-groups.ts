import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GroupCollection } from '../../components/group-collection/group-collection';
import { SinglesPlansFacade } from '../../../../core/application/singles-plans.facade';

@Component({
  selector: 'app-all-groups',
  imports: [GroupCollection],
  templateUrl: './all-groups.html'
})
export class AllGroupsPage {
  readonly vm = inject(SinglesPlansFacade);
  private readonly router = inject(Router);

  createGroup(): void {
    void this.router.navigate(['/grupos/crear']);
  }

  createEvent(groupId: string): void {
    void this.router.navigate(['/eventos/crear'], { queryParams: { grupo: groupId } });
  }
}
