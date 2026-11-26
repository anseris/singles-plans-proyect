import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, type AppUser } from '../../../../core/auth/auth.service';
import { GroupsService } from '../../../groups/data-access/groups.service';
import { ProfilePage } from './profile';

describe('ProfilePage', () => {
  const user = signal<AppUser | null>({
    id: 'user-1',
    name: 'Ana García',
    email: 'ana@example.com',
    role: 'user',
    location: 'Madrid',
    createdAt: '2026-11-05T10:00:00.000Z',
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user } },
        {
          provide: GroupsService,
          useValue: { interestGroups: () => of([]), myGroups: () => of([]) },
        },
      ],
    }).compileComponents();
  });

  it('formats the account creation date as month and year', () => {
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    expect(fixture.componentInstance.memberSince()).toBe('Nov 2026');
    expect(fixture.nativeElement.textContent).toContain('Miembro desde Nov 2026');
  });

  it('shows the profile details and the initial avatar', () => {
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ana García');
    expect(text).toContain('ana@example.com');
    expect(text).toContain('Madrid');
    expect(fixture.nativeElement.querySelector('.user-avatar-initial')?.textContent?.trim()).toBe('A');
  });

  it('shows the managed groups tab only for superusers', () => {
    const previous = user();
    user.set({ ...previous!, superusuario: true });
    try {
      const fixture = TestBed.createComponent(ProfilePage);
      fixture.detectChanges();

      expect(fixture.componentInstance.showManagedTab()).toBe(true);
      expect((fixture.nativeElement.textContent as string)).toContain('Grupos que gestiono');
    } finally {
      user.set(previous);
    }
  });
});
