import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import type { GroupItem } from '../../models/group.model';

@Component({
  selector: 'app-group-collection',
  imports: [ButtonModule],
  templateUrl: './group-collection.html',
  styleUrl: './group-collection.scss'
})
export class GroupCollection {
  readonly groups = input.required<GroupItem[]>();
  readonly authenticated = input.required<boolean>();
  readonly createRequested = output<void>();
  readonly loginRequested = output<void>();
  readonly groupSelected = output<GroupItem>();
  readonly eventRequested = output<GroupItem>();
}
