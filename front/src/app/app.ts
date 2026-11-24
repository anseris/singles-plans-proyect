import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SiteHeader } from './layout/site-header/site-header';
import { SinglesPlansFacade } from './core/application/singles-plans.facade';
import { SiteFooter } from './shared/components/site-footer/site-footer';

@Component({
  selector: 'app-root',
  imports: [FormsModule, ButtonModule, DialogModule, InputTextModule, RouterOutlet, SiteHeader, SiteFooter],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  readonly vm = inject(SinglesPlansFacade);

  ngOnInit(): void {
    this.vm.initialize();
  }
}
