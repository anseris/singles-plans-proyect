import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { firstValueFrom } from 'rxjs';
import { DatePipe } from '@angular/common';
import { GooglePlaceAutocompleteDirective } from '../../directives/google-place-autocomplete.directive';
import { SinglesPlansFacade } from '../../../../core/application/singles-plans.facade';
import { RichTextEditor } from '../../../../shared/components/rich-text-editor/rich-text-editor';
import { RichText } from '../../../../shared/components/rich-text/rich-text';
import { EventsService } from '../../data-access/events.service';

@Component({
  selector: 'app-event-create',
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    DatePipe,
    GooglePlaceAutocompleteDirective,
    RichTextEditor,
    RichText,
  ],
  templateUrl: './event-create.html',
  styleUrl: './event-create.scss',
})
export class EventCreatePage {
  readonly vm = inject(SinglesPlansFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventsApi = inject(EventsService);
  readonly eventConfirmationOpen = signal(false);
  readonly loadingEdit = signal(false);
  readonly confirmationMessage = signal('');
  eventInterestDraft = '';

  get previewGroupName(): string {
    return (
      this.vm.groups().find((group) => group._id === this.vm.newEvent.groupId)?.name ?? ''
    );
  }

  ngOnInit(): void {
    const editingId = this.route.snapshot.queryParamMap.get('editar');
    if (editingId) {
      if (this.vm.editingId() === editingId) return;
      void this.loadEventForEdit(editingId);
      return;
    }
    const groupId = this.route.snapshot.queryParamMap.get('grupo');
    if (groupId) {
      this.vm.createEventForGroupId(groupId);
    } else {
      this.vm.openCreateEvent();
    }
  }

  async submit(): Promise<void> {
    if (this.loadingEdit()) return;
    const editingId = this.vm.editingId();
    const event = await this.vm.submitEvent();
    if (!event) return;
    if (editingId) {
      void this.router.navigate(
        this.vm.isAdmin ? ['/administracion'] : ['/eventos/detalles', editingId],
      );
      return;
    }
    this.confirmationMessage.set(
      event.status === 'pending'
        ? 'Tu evento se ha enviado y está pendiente de aprobación por SinglesPlans.'
        : 'Tu evento ya está publicado en SinglesPlans.',
    );
    this.eventConfirmationOpen.set(true);
  }

  backToEvents(): void {
    this.eventConfirmationOpen.set(false);
    if (this.vm.isAdmin) this.vm.switchView(false);
    else void this.router.navigate(['/eventos']);
  }

  addEventInterest(): void {
    if (this.vm.addEventInterest(this.eventInterestDraft)) this.eventInterestDraft = '';
  }

  cancel(): void {
    const editingId = this.vm.editingId();
    void this.router.navigate(editingId ? ['/eventos/detalles', editingId] : ['/eventos']);
  }

  private async loadEventForEdit(id: string): Promise<void> {
    this.loadingEdit.set(true);
    this.vm.error.set('');
    try {
      const event = await firstValueFrom(this.eventsApi.eventDetails(id));
      if (!event.isCreator && !this.vm.isAdmin) {
        void this.router.navigate(['/eventos/detalles', id]);
        return;
      }
      this.vm.prepareEventEdit(event);
    } catch (error) {
      this.vm.error.set(
        error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
          ? error.error.message
          : 'No se pudo cargar el evento para editarlo.',
      );
      void this.router.navigate(['/eventos']);
    } finally {
      this.loadingEdit.set(false);
    }
  }
}
