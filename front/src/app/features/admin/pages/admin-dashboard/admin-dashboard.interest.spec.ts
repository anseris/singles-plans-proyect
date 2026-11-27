import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SinglesPlansFacade } from '../../../../core/application/singles-plans.facade';
import { AdminDashboard } from './admin-dashboard';

describe('AdminDashboard interest form', () => {
  it('emite el interés escrito al enviar el formulario y limpia el campo', async () => {
    TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [
        {
          provide: SinglesPlansFacade,
          useValue: {
            planSettings: signal({ standardPrice: 0, standardFreeEvents: 0, proMonthlyPrice: 0 }),
            updatePlanSettings: () => {},
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(AdminDashboard);
    fixture.componentRef.setInput('events', []);
    fixture.componentRef.setInput('groups', []);
    fixture.componentRef.setInput('interests', []);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', '');
    fixture.componentRef.setInput('notice', '');
    fixture.componentRef.setInput('pendingCount', 0);
    fixture.componentRef.setInput('publishedCount', 0);
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.interestCreateRequested.subscribe((name) => emitted.push(name));

    const input = fixture.nativeElement.querySelector('input[name="interestName"]') as HTMLInputElement;
    input.value = 'Senderismo';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.interest-create-form button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.click();
    fixture.detectChanges();

    expect(emitted).toEqual(['Senderismo']);
    expect(fixture.componentInstance.interestDraft).toBe('');
    expect(input.value).toBe('');
  });
});
