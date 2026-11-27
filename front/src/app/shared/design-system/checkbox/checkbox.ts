import { Component, forwardRef, input, output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'p-checkbox',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiCheckbox),
      multi: true,
    },
  ],
  template: `
    <input
      class="sp-checkbox"
      type="checkbox"
      [id]="inputId()"
      [attr.name]="name()"
      [checked]="value"
      [disabled]="isDisabled()"
      (change)="handleChange($event)"
      (blur)="handleBlur()"
    />
  `,
})
export class UiCheckbox implements ControlValueAccessor {
  readonly inputId = input('');
  readonly name = input('');
  readonly binary = input(true);
  readonly disabledInput = input(false, { alias: 'disabled' });
  readonly onBlur = output<void>();

  value = false;
  private formDisabled = false;
  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  isDisabled(): boolean {
    return this.disabledInput() || this.formDisabled;
  }

  writeValue(value: boolean | null): void {
    this.value = value === true;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  handleChange(event: Event): void {
    this.value = (event.target as HTMLInputElement).checked;
    this.onChange(this.value);
  }

  handleBlur(): void {
    this.onTouched();
    this.onBlur.emit();
  }
}
