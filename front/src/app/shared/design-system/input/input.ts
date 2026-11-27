import { Directive } from '@angular/core';

@Directive({
  selector: '[pInputText]',
  host: { class: 'sp-input' },
})
export class UiInputText {}
