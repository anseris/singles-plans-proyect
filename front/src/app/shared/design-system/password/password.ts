import { Component, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'p-password',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiPassword),
      multi: true,
    },
  ],
  template: `
    <div class="sp-password">
      <input
        class="sp-input"
        [id]="inputId()"
        [attr.name]="name()"
        [type]="visible() ? 'text' : 'password'"
        [attr.autocomplete]="autocomplete()"
        [attr.placeholder]="placeholder()"
        [value]="value"
        [disabled]="isDisabled()"
        (input)="handleInput($event)"
        (blur)="handleBlur()"
      />
      @if (toggleMask()) {
        <button
          class="sp-password-toggle"
          type="button"
          [attr.aria-label]="visible() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          (click)="visible.update((current) => !current)"
        >
          <i [class]="visible() ? 'pi pi-eye-slash' : 'pi pi-eye'" aria-hidden="true"></i>
        </button>
      }
    </div>
  `,
})
export class UiPassword implements ControlValueAccessor {
  readonly inputId = input('');
  readonly name = input('');
  readonly placeholder = input('');
  readonly autocomplete = input('off');
  readonly toggleMask = input(false);
  readonly feedback = input(true);
  readonly disabledInput = input(false, { alias: 'disabled' });
  readonly onBlur = output<void>();

  readonly visible = signal(false);
  value = '';

  private formDisabled = false;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  isDisabled(): boolean {
    return this.disabledInput() || this.formDisabled;
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  handleInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.onChange(this.value);
  }

  handleBlur(): void {
    this.onTouched();
    this.onBlur.emit();
  }
}
