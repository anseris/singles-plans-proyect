import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService, type AppUser } from '../../../../core/auth/auth.service';
import { GroupsService } from '../../../groups/data-access/groups.service';
import { SettingsPage } from './settings';

describe('SettingsPage', () => {
  const user = signal<AppUser | null>(null);
  let createInterest: ReturnType<typeof vi.fn>;

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
    createInterest = vi.fn();

    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        { provide: AuthService, useValue: { user } },
        {
          provide: GroupsService,
          useValue: {
            allInterests: () => of([
              { _id: 'interest-1', name: 'Senderismo' },
              { _id: 'interest-2', name: 'Cine' },
            ]),
            createInterest,
          },
        },
      ],
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

  it('carga el catálogo de intereses desde la BBDD', async () => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.interestCatalog()).toEqual(['Senderismo', 'Cine']);
    expect(fixture.componentInstance.availableInterests()).toEqual(['Senderismo', 'Cine', 'Viajes']);
    fixture.componentInstance.selectTab('personal');
    fixture.detectChanges();
    const tags = Array.from(
      fixture.nativeElement.querySelectorAll('.interest-tag') as NodeListOf<HTMLElement>,
    ).map((element) => element.textContent?.trim());
    expect(tags).toEqual(['Senderismo', 'Cine', 'Viajes']);
  });

  it('carga los valores guardados y permite alternar intereses', async () => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
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

  it('añade un interés personalizado solo a los intereses del usuario', async () => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance;

    page.customInterestDraft.set('  Padel  ');
    page.addCustomInterest();

    expect(page.interests()).toEqual(['Viajes', 'Padel']);
    expect(page.availableInterests()).toContain('Padel');
    expect(page.interestCatalog()).toEqual(['Senderismo', 'Cine']);
    expect(createInterest).not.toHaveBeenCalled();
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
