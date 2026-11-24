import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CurrencyPipe } from '@angular/common';
import { SinglesPlansFacade } from '../../../../core/application/singles-plans.facade';
import type { GroupItem } from '../../models/group.model';

@Component({
  selector: 'app-group-create',
  imports: [FormsModule, ButtonModule, InputTextModule, CurrencyPipe],
  templateUrl: './group-create.html',
  styleUrl: './group-create.scss',
})
export class GroupCreatePage {
  readonly vm = inject(SinglesPlansFacade);
  private readonly router = inject(Router);
  readonly createdGroup = signal<GroupItem | null>(null);
  interestDraft = '';

  ngOnInit(): void {
    this.vm.openCreateGroup();
  }

  async submit(): Promise<void> {
    if (this.createdGroup()) return;
    const group = await this.vm.submitGroup();
    if (group) this.createdGroup.set(group);
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
    void this.router.navigate(['/eventos']);
  }
}
