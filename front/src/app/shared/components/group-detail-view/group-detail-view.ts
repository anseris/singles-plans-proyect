import { Component, input, output } from '@angular/core';
import type { GroupItem } from '../../../features/groups/models/group.model';
import { RichText } from '../rich-text/rich-text';

@Component({
  selector: 'app-group-detail-view',
  imports: [RichText],
  templateUrl: './group-detail-view.html',
  styleUrl: './group-detail-view.scss',
})
export class GroupDetailView {
  readonly group = input.required<GroupItem>();
  readonly createdByName = input('');
  readonly createdById = input('');
  readonly memberCount = input(0);
  readonly eventCount = input(0);
  readonly creatorSelected = output<string>();

  openCreator(): void {
    const id = this.createdById();
    if (id) this.creatorSelected.emit(id);
  }
}
