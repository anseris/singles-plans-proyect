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
  avatarUrl?: string;
  createdAt?: string;
  aboutMe?: string;
  showGroups?: boolean;
  showMaritalStatus?: boolean;
  birthDate?: string;
  gender?: string;
  interests?: string[];
  maritalStatus?: string;
  occupation?: string;
  contactPermission?: string;
}

export interface ProfileInput {
  name: string;
  location: string;
  aboutMe: string;
  showGroups: boolean;
  showMaritalStatus: boolean;
  birthDate: string;
  gender: string;
  interests: string[];
  maritalStatus: string;
  occupation: string;
  contactPermission: string;
  avatar?: File | null;
  removeAvatar?: boolean;
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

  oauthUrl(provider: 'google' | 'apple' | 'facebook'): string {
    const configuredOrigin =
      typeof window === 'undefined'
        ? ''
        : (window.SINGLESPLANS_CONFIG?.apiOrigin?.trim() ?? '').replace(/\/+$/, '');
    const origin = configuredOrigin || '';
    return `${origin}/api/auth/oauth/${provider}`;
  }

  async updateProfile(input: ProfileInput): Promise<void> {
    const body = new FormData();
    body.append('name', input.name);
    body.append('location', input.location);
    body.append('aboutMe', input.aboutMe);
    body.append('showGroups', String(input.showGroups));
    body.append('showMaritalStatus', String(input.showMaritalStatus));
    body.append('birthDate', input.birthDate);
    body.append('gender', input.gender);
    body.append('interests', JSON.stringify(input.interests));
    body.append('maritalStatus', input.maritalStatus);
    body.append('occupation', input.occupation);
    body.append('contactPermission', input.contactPermission);
    if (input.avatar) body.append('avatar', input.avatar, input.avatar.name);
    if (input.removeAvatar) body.append('removeAvatar', 'true');
    this.user.set(await firstValueFrom(this.http.patch<AppUser>('/api/auth/me', body)));
  }

  async completeOAuth(token: string): Promise<void> {
    sessionStorage.setItem('singles-plans-token', token);
    localStorage.removeItem('singles-plans-token');
    try {
      this.user.set(await firstValueFrom(this.http.get<AppUser>('/api/auth/me')));
    } catch (error) {
      this.logout();
      throw error;
    }
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
