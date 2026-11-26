import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    }).compileComponents();
  });

  it('uses the development proxy when no public API origin is configured', () => {
    const previous = window.SINGLESPLANS_CONFIG;
    window.SINGLESPLANS_CONFIG = { apiOrigin: '' };
    try {
      const service = TestBed.inject(AuthService);
      expect(service.oauthUrl('google')).toBe('/api/auth/oauth/google');
    } finally {
      window.SINGLESPLANS_CONFIG = previous;
    }
  });

  it('uses the public API origin when it is configured', () => {
    const previous = window.SINGLESPLANS_CONFIG;
    window.SINGLESPLANS_CONFIG = { apiOrigin: 'https://api.example.com/' };
    try {
      const service = TestBed.inject(AuthService);
      expect(service.oauthUrl('apple')).toBe('https://api.example.com/api/auth/oauth/apple');
    } finally {
      window.SINGLESPLANS_CONFIG = previous;
    }
  });
});
