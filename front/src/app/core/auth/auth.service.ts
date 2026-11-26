import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  superusuario?: boolean;
  location?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  location: string;
  adultConfirmed: boolean;
  captchaToken: string;
}

interface AuthResponse {
  token: string;
  user: AppUser;
  rememberMe?: boolean;
}

interface ResetPasswordResponse extends AuthResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly user = signal<AppUser | null>(null);

  async login(email: string, password: string, rememberMe = false): Promise<void> {
    this.setSession(
      await firstValueFrom(
        this.http.post<AuthResponse>('/api/auth/login', {
          email,
          password,
          rememberMe,
        }),
      ),
    );
  }

  async register(input: RegisterInput): Promise<void> {
    this.setSession(await firstValueFrom(this.http.post<AuthResponse>('/api/auth/register', input)));
  }

  requestPasswordReset(email: string, captchaToken: string): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>('/api/auth/password/forgot', {
        email,
        captchaToken,
      }),
    );
  }

  async resetPassword(
    token: string,
    password: string,
    captchaToken: string,
  ): Promise<ResetPasswordResponse> {
    const response = await firstValueFrom(
      this.http.post<ResetPasswordResponse>('/api/auth/password/reset', {
        token,
        password,
        captchaToken,
      }),
    );
    this.setSession(response);
    return response;
  }

  async restoreSession(): Promise<void> {
    if (!this.token()) return;
    try {
      this.user.set(await firstValueFrom(this.http.get<AppUser>('/api/auth/me')));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.logout();
        return;
      }
      throw error;
    }
  }

  logout(): void {
    sessionStorage.removeItem('singles-plans-token');
    localStorage.removeItem('singles-plans-token');
    this.user.set(null);
  }

  setSuperusuario(value: boolean): void {
    const currentUser = this.user();
    if (currentUser) this.user.set({ ...currentUser, superusuario: value });
  }

  token(): string | null {
    return sessionStorage.getItem('singles-plans-token') ?? localStorage.getItem('singles-plans-token');
  }

  private setSession(response: AuthResponse): void {
    sessionStorage.setItem('singles-plans-token', response.token);
    if (response.rememberMe) localStorage.setItem('singles-plans-token', response.token);
    else localStorage.removeItem('singles-plans-token');
    this.user.set(response.user);
  }
}
