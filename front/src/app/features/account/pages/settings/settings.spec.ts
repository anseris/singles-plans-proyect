import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService, type AppUser } from '../../../../core/auth/auth.service';
import { SettingsPage } from './settings';

describe('SettingsPage', () => {
  const user = signal<AppUser | null>(null);

  beforeEach(async () => {
    user.set({
      id: 'user-1',
      name: 'Ana García',
      email: 'ana@example.com',
      role: 'user',
      superusuario: true,
      location: 'Madrid',
      aboutMe: 'Me encantan los planes al aire libre.',
      showGroups: true,
      showMaritalStatus: false,
      birthDate: '1995-06-15',
      gender: 'mujer',
      interests: ['Viajes'],
      maritalStatus: 'soltero',
      occupation: 'tecnologia',
      contactPermission: 'miembros-grupos',
    });

    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [{ provide: AuthService, useValue: { user } }],
    }).compileComponents();
  });

  it('muestra el rol Organizador y las tres pestañas', () => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.roleLabel()).toBe('Organizador');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Perfil');
    expect(text).toContain('Información Personal');
    expect(text).toContain('Privacidad');
    expect(text).not.toContain('Mi nombre de usuario');
  });

  it('muestra Miembro cuando no es superusuario', () => {
    user.set({ ...user()!, superusuario: false });
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.roleLabel()).toBe('Miembro');
  });

  it('carga los valores guardados y permite alternar intereses', () => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;

    expect(page.name()).toBe('Ana García');
    expect(page.aboutMe()).toContain('planes al aire libre');
    expect(page.interests()).toEqual(['Viajes']);

    page.toggleInterest('Cine');
    expect(page.interests()).toEqual(['Viajes', 'Cine']);
    page.toggleInterest('Cine');
    expect(page.interests()).toEqual(['Viajes']);
  });

  it('incluye los tooltips de privacidad en la pestaña Perfil', () => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();

    const tooltips = Array.from(
      fixture.nativeElement.querySelectorAll('.info-icon') as NodeListOf<HTMLElement>,
    ).map((element) => element.dataset['tooltip']);
    expect(tooltips).toContain('Todos los usuarios podrán ver tus grupos');
    expect(tooltips).toContain('Todos los usuarios podrán ver tu estado civil');
  });
});
