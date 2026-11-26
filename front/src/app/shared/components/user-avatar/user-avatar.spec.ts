import { TestBed } from '@angular/core/testing';
import { UserAvatar } from './user-avatar';

describe('UserAvatar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UserAvatar] }).compileComponents();
  });

  it('shows the uppercase first letter when there is no image', () => {
    const fixture = TestBed.createComponent(UserAvatar);
    fixture.componentRef.setInput('name', 'ana');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.user-avatar-initial')?.textContent?.trim()).toBe('A');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('shows the avatar image when a URL is configured', () => {
    const fixture = TestBed.createComponent(UserAvatar);
    fixture.componentRef.setInput('name', 'Ana');
    fixture.componentRef.setInput('avatarUrl', '/uploads/avatars/ana.png');
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('/uploads/avatars/ana.png');
    expect(image.getAttribute('alt')).toBe('Avatar de Ana');
  });
});
