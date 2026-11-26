import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-oauth-callback',
  imports: [RouterLink],
  templateUrl: './oauth-callback.html',
  styleUrl: './oauth-callback.scss',
})
export class OAuthCallback implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    void this.complete();
  }

  private async complete(): Promise<void> {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = params.get('token');
    const providerError = params.get('error');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    if (providerError) {
      this.error.set(providerError);
      this.loading.set(false);
      return;
    }
    if (!token) {
      this.error.set('No se pudo completar el acceso. Solicita una nueva sesión.');
      this.loading.set(false);
      return;
    }

    try {
      await this.auth.completeOAuth(token);
      await this.router.navigate(['/eventos']);
    } catch {
      this.error.set('La sesión de acceso no es válida. Vuelve a iniciar sesión.');
    } finally {
      this.loading.set(false);
    }
  }
}
