import { Component, OnInit, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SiteHeader } from './layout/site-header/site-header';
import { SinglesPlansFacade } from './core/application/singles-plans.facade';
import { SiteFooter } from './shared/components/site-footer/site-footer';
import { TurnstileWidget } from './shared/components/turnstile-widget/turnstile-widget';

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    PasswordModule,
    RouterOutlet,
    SiteHeader,
    SiteFooter,
    TurnstileWidget,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  readonly vm = inject(SinglesPlansFacade);
  private readonly captcha = viewChild(TurnstileWidget);

  ngOnInit(): void {
    void this.vm.initialize();
  }

  async submitAuth(): Promise<void> {
    await this.vm.submitAuth();
    if (this.vm.error() || !this.vm.dialogOpen()) this.captcha()?.reset();
  }

  async requestPasswordReset(): Promise<void> {
    await this.vm.requestPasswordReset();
    if (this.vm.error() || !this.vm.dialogOpen()) this.captcha()?.reset();
  }
}
