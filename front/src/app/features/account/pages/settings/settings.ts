import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserAvatar } from '../../../../shared/components/user-avatar/user-avatar';

type SettingsTab = 'profile' | 'personal' | 'privacy';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024;
const MAX_INTERESTS = 10;

const INTERESTS = [
  'Viajes',
  'Cine',
  'Música',
  'Senderismo',
  'Gastronomía',
  'Fotografía',
  'Deporte',
  'Lectura',
  'Arte',
  'Tecnología',
  'Mascotas',
  'Cocina',
];

const GENDERS = [
  { value: '', label: 'Selecciona una opción' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'hombre', label: 'Hombre' },
  { value: 'no-binario', label: 'No binario' },
  { value: 'otro', label: 'Otro' },
  { value: 'prefiero-no-decirlo', label: 'Prefiero no decirlo' },
];

const MARITAL_STATUSES = [
  { value: '', label: 'Selecciona una opción' },
  { value: 'soltero', label: 'Soltero/a' },
  { value: 'en-pareja', label: 'En pareja' },
  { value: 'casado', label: 'Casado/a' },
  { value: 'divorciado', label: 'Divorciado/a' },
  { value: 'viudo', label: 'Viudo/a' },
  { value: 'prefiero-no-decirlo', label: 'Prefiero no decirlo' },
];

const OCCUPATIONS = [
  { value: '', label: 'Selecciona una opción' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'sanidad', label: 'Sanidad' },
  { value: 'educacion', label: 'Educación' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'hosteleria', label: 'Hostelería' },
  { value: 'arte-diseno', label: 'Arte y diseño' },
  { value: 'deporte', label: 'Deporte' },
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'jubilado', label: 'Jubilado/a' },
  { value: 'otro', label: 'Otro' },
  { value: 'prefiero-no-decirlo', label: 'Prefiero no decirlo' },
];

const CONTACT_OPTIONS = [
  { value: 'organizadores', label: 'Solo organizadores' },
  { value: 'miembros-grupos', label: 'Miembros de mis grupos' },
  { value: 'cualquiera', label: 'Cualquiera' },
];

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule, UserAvatar],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsPage implements OnDestroy {
  private readonly auth = inject(AuthService);
  private initialized = false;
  private objectUrl = '';

  readonly user = this.auth.user;
  readonly today = new Date().toISOString().slice(0, 10);
  readonly interestCatalog = INTERESTS;
  readonly genderOptions = GENDERS;
  readonly maritalStatusOptions = MARITAL_STATUSES;
  readonly occupationOptions = OCCUPATIONS;
  readonly contactOptions = CONTACT_OPTIONS;

  readonly activeTab = signal<SettingsTab>('profile');
  readonly name = signal('');
  readonly location = signal('');
  readonly aboutMe = signal('');
  readonly showGroups = signal(false);
  readonly showMaritalStatus = signal(false);
  readonly birthDate = signal('');
  readonly gender = signal('');
  readonly interests = signal<string[]>([]);
  readonly maritalStatus = signal('');
  readonly occupation = signal('');
  readonly contactPermission = signal('miembros-grupos');
  readonly previewUrl = signal('');
  readonly selectedFile = signal<File | null>(null);
  readonly removeAvatar = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  readonly roleLabel = computed(() => (this.user()?.superusuario ? 'Organizador' : 'Miembro'));
  readonly canSave = computed(
    () =>
      this.name().trim().length > 0 &&
      this.name().trim().length <= 100 &&
      this.location().trim().length <= 120 &&
      this.aboutMe().length <= 1000 &&
      this.contactPermission().length > 0 &&
      !this.saving(),
  );

  constructor() {
    effect(() => {
      const current = this.user();
      if (!current || this.initialized) return;
      this.name.set(current.name);
      this.location.set(current.location ?? '');
      this.aboutMe.set(current.aboutMe ?? '');
      this.showGroups.set(current.showGroups ?? false);
      this.showMaritalStatus.set(current.showMaritalStatus ?? false);
      this.birthDate.set(current.birthDate ?? '');
      this.gender.set(current.gender ?? '');
      this.interests.set(current.interests ?? []);
      this.maritalStatus.set(current.maritalStatus ?? '');
      this.occupation.set(current.occupation ?? '');
      this.contactPermission.set(current.contactPermission ?? 'miembros-grupos');
      this.previewUrl.set(current.avatarUrl ?? '');
      this.initialized = true;
    });
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }

  selectTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

  toggleInterest(interest: string): void {
    this.interests.update((current) => {
      if (current.includes(interest)) return current.filter((item) => item !== interest);
      if (current.length >= MAX_INTERESTS) {
        this.error.set(`Puedes elegir un máximo de ${MAX_INTERESTS} intereses.`);
        return current;
      }
      this.error.set('');
      return [...current, interest];
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      this.error.set('Formato no permitido. Usa una imagen JPG, PNG o WebP.');
      input.value = '';
      return;
    }
    if (file.size > MAX_SIZE) {
      this.error.set('La imagen no puede superar los 2 MB.');
      input.value = '';
      return;
    }

    this.revokeObjectUrl();
    this.objectUrl = URL.createObjectURL(file);
    this.selectedFile.set(file);
    this.removeAvatar.set(false);
    this.previewUrl.set(this.objectUrl);
    this.error.set('');
  }

  removeImage(): void {
    this.revokeObjectUrl();
    this.selectedFile.set(null);
    this.removeAvatar.set(true);
    this.previewUrl.set('');
    const input = document.getElementById('avatar-file') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  async save(): Promise<void> {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');

    try {
      await this.auth.updateProfile({
        name: this.name().trim(),
        location: this.location().trim(),
        aboutMe: this.aboutMe().trim(),
        showGroups: this.showGroups(),
        showMaritalStatus: this.showMaritalStatus(),
        birthDate: this.birthDate(),
        gender: this.gender(),
        interests: this.interests(),
        maritalStatus: this.maritalStatus(),
        occupation: this.occupation(),
        contactPermission: this.contactPermission(),
        avatar: this.selectedFile(),
        removeAvatar: this.removeAvatar(),
      });
      this.revokeObjectUrl();
      this.selectedFile.set(null);
      this.removeAvatar.set(false);
      this.previewUrl.set(this.user()?.avatarUrl ?? '');
      this.notice.set('Tu configuración se ha guardado.');
    } catch (error) {
      this.error.set(
        error instanceof HttpErrorResponse &&
          typeof error.error === 'object' &&
          error.error !== null &&
          typeof (error.error as { message?: unknown }).message === 'string'
          ? (error.error as { message: string }).message
          : 'No se pudo guardar la configuración. Inténtalo de nuevo.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = '';
    }
  }
}
