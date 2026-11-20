import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import type { GroupItem } from '../../models/group.model';

@Component({
  selector: 'app-group-detail',
  imports: [ButtonModule],
  templateUrl: './group-detail.html',
  styleUrl: './group-detail.scss'
})
export class GroupDetail {
  readonly group = input.required<GroupItem>();
  readonly backRequested = output<void>();
  readonly eventRequested = output<GroupItem>();
}
