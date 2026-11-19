import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthResponse {
  token: string;
  user: AppUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly user = signal<AppUser | null>(null);

  async login(email: string, password: string): Promise<void> {
    this.setSession(await firstValueFrom(this.http.post<AuthResponse>('/api/auth/login', { email, password })));
  }

  async register(input: { name: string; email: string; password: string }): Promise<void> {
    this.setSession(await firstValueFrom(this.http.post<AuthResponse>('/api/auth/register', input)));
  }

  async restoreSession(): Promise<void> {
    if (!sessionStorage.getItem('singles-plans-token')) return;
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
    this.user.set(null);
  }

  token(): string | null {
    return sessionStorage.getItem('singles-plans-token');
  }

  private setSession(response: AuthResponse): void {
    sessionStorage.setItem('singles-plans-token', response.token);
    this.user.set(response.user);
  }
}
