import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { GooglePlaceAutocompleteDirective } from '../../directives/google-place-autocomplete.directive';
import { SinglesPlansFacade } from '../../../../core/application/singles-plans.facade';

@Component({
  selector: 'app-event-create',
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    GooglePlaceAutocompleteDirective,
  ],
  templateUrl: './event-create.html',
  styleUrl: './event-create.scss',
})
export class EventCreatePage {
  readonly vm = inject(SinglesPlansFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly eventConfirmationOpen = signal(false);
  readonly confirmationMessage = signal('');
  eventInterestDraft = '';

  ngOnInit(): void {
    const groupId = this.route.snapshot.queryParamMap.get('grupo');
    if (groupId) {
      this.vm.createEventForGroupId(groupId);
    } else {
      this.vm.openCreateEvent();
    }
  }

  async submit(): Promise<void> {
    const editing = !!this.vm.editingId();
    const event = await this.vm.submitEvent();
    if (!event) return;
    if (editing) {
      void this.router.navigate([this.vm.isAdmin ? '/administracion' : '/eventos']);
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
    void this.router.navigate(['/eventos']);
  }
}
