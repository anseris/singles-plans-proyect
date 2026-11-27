import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CurrencyPipe } from '@angular/common';
import { SinglesPlansFacade } from '../../../../core/application/singles-plans.facade';
import { RichTextEditor } from '../../../../shared/components/rich-text-editor/rich-text-editor';
import { RichText } from '../../../../shared/components/rich-text/rich-text';
import type { GroupItem } from '../../models/group.model';
import { GroupsService } from '../../data-access/groups.service';
import { sanitizeRichText } from '../../../../shared/utils/rich-text';

@Component({
  selector: 'app-group-create',
  imports: [FormsModule, ButtonModule, InputTextModule, CurrencyPipe, RichTextEditor, RichText],
  templateUrl: './group-create.html',
  styleUrl: './group-create.scss',
})
export class GroupCreatePage {
  readonly vm = inject(SinglesPlansFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly groupsApi = inject(GroupsService);
  readonly createdGroup = signal<GroupItem | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly loadingEdit = signal(false);
  interestDraft = '';

  ngOnInit(): void {
    const editingId = this.route.snapshot.queryParamMap.get('editar');
    if (editingId) {
      void this.loadGroupForEdit(editingId);
    } else {
      this.vm.openCreateGroup();
    }
  }

  async submit(): Promise<void> {
    if (this.createdGroup() || this.loadingEdit()) return;
    const editingId = this.editingId();
    if (editingId) {
      this.vm.error.set('');
      try {
        const group = await firstValueFrom(
          this.groupsApi.updateGroup(editingId, {
            ...this.vm.newGroup,
            name: this.vm.newGroup.name.trim(),
            description: sanitizeRichText(this.vm.newGroup.description),
            city: this.vm.newGroup.city.trim(),
          }),
        );
        this.vm.groups.update((groups) => groups.map((item) => item._id === group._id ? group : item));
        this.vm.myGroups.update((groups) => groups.map((item) => item._id === group._id ? group : item));
        this.vm.allGroups.update((groups) => groups.map((item) => item._id === group._id ? group : item));
        this.vm.groupsNeedRefresh.set(true);
        void this.router.navigate(['/grupos', group._id]);
      } catch (error) {
        this.vm.error.set(
          error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
            ? error.error.message
            : 'No se pudo guardar el grupo. Inténtalo de nuevo.',
        );
      }
      return;
    }
    const group = await this.vm.submitGroup();
    if (group) this.createdGroup.set(group);
  }

  private async loadGroupForEdit(id: string): Promise<void> {
    this.loadingEdit.set(true);
    this.vm.error.set('');
    try {
      const [details, interests] = await Promise.all([
        firstValueFrom(this.groupsApi.groupDetails(id)),
        firstValueFrom(this.groupsApi.allInterests()),
      ]);
      if (!this.vm.isAdmin && this.vm.user()?.id !== details.createdById) {
        void this.router.navigate(['/grupos', id]);
        return;
      }
      this.editingId.set(id);
      this.vm.newGroup = {
        ...details.group,
        imageUrl: details.group.imageUrl ?? '',
        interests: details.group.interests ?? [],
        plan: details.group.plan ?? 'standard',
      };
      this.vm.availableGroupInterests.set(interests);
      this.vm.newGroupInterestOptions.set(
        this.vm.newGroup.interests.filter(
          (interest) => !interests.some((available) => available.name === interest),
        ),
      );
      this.vm.groupStep.set(1);
    } catch (error) {
      this.vm.error.set(
        error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
          ? error.error.message
          : 'No se pudo cargar el grupo para editarlo.',
      );
      void this.router.navigate(['/eventos']);
    } finally {
      this.loadingEdit.set(false);
    }
  }

  async createInterest(): Promise<void> {
    const name = this.interestDraft.trim();
    if (!name) return;
    this.vm.addGroupInterest(name);
    this.interestDraft = '';
  }

  createEvent(): void {
    const group = this.createdGroup();
    if (!group) return;
    void this.router.navigate(['/eventos/crear'], { queryParams: { grupo: group._id } });
  }

  cancel(): void {
    const groupId = this.editingId();
    void this.router.navigate(groupId ? ['/grupos', groupId] : ['/eventos']);
  }
}
