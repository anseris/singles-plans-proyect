import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { AdminDashboard } from './features/admin/pages/admin-dashboard/admin-dashboard';
import { EventsPage } from './features/events/pages/events-page/events-page';
import { GooglePlaceAutocompleteDirective } from './features/events/directives/google-place-autocomplete.directive';
import { GroupDetail } from './features/groups/pages/group-detail/group-detail';
import { SiteHeader } from './layout/site-header/site-header';
import { SinglesPlansFacade } from './core/application/singles-plans.facade';
import { SiteFooter } from './shared/components/site-footer/site-footer';

@Component({
  selector: 'app-root',
  imports: [FormsModule, ButtonModule, DialogModule, InputTextModule, GooglePlaceAutocompleteDirective, SiteHeader, GroupDetail, AdminDashboard, EventsPage, SiteFooter],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  readonly vm = inject(SinglesPlansFacade);

  ngOnInit(): void {
    this.vm.initialize();
  }
}
