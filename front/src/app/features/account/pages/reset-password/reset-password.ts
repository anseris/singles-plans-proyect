import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UiButton, UiPassword } from '../../../../shared/design-system';
import { AuthService } from '../../../../core/auth/auth.service';
import { TurnstileWidget } from '../../../../shared/components/turnstile-widget/turnstile-widget';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, UiButton, UiPassword, RouterLink, TurnstileWidget],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly captcha = viewChild(TurnstileWidget);

  readonly token = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly captchaToken = signal('');
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly formValid = computed(
    () =>
      this.token().trim().length > 0 &&
      this.password().length >= 8 &&
      this.password().length <= 72 &&
      this.password() === this.confirmPassword() &&
      !!this.captchaToken(),
  );

  ngOnInit(): void {
    if (typeof window === 'undefined') return;
    const hashToken = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
    const queryToken = new URLSearchParams(window.location.search).get('token');
    const token = hashToken ?? queryToken ?? '';
    this.token.set(token);
    if (!token) {
      this.error.set('El enlace no es válido. Solicita uno nuevo desde «¿Olvidaste tu contraseña?».');
    }
  }

  setCaptchaToken(token: string): void {
    this.captchaToken.set(token);
    if (token) this.error.set('');
  }

  async submit(): Promise<void> {
    if (this.submitting() || !this.formValid()) return;
    this.error.set('');
    this.submitting.set(true);
    try {
      const response = await this.auth.resetPassword(
        this.token().trim(),
        this.password(),
        this.captchaToken(),
      );
      this.notice.set(response.message);
      this.password.set('');
      this.confirmPassword.set('');
      await this.router.navigate(['/eventos']);
    } catch (error) {
      this.error.set(
        error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
          ? error.error.message
          : 'No se pudo actualizar la contraseña. Solicita un enlace nuevo e inténtalo de nuevo.',
      );
    } finally {
      this.submitting.set(false);
      this.captchaToken.set('');
      this.captcha()?.reset();
    }
  }
}
