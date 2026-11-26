import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  output,
  signal,
  SimpleChanges,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  const scriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/"]',
    );
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Turnstile no pudo cargarse.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&hl=es';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile no pudo cargarse.'));
    document.head.appendChild(script);
  });
  turnstileScriptPromise = scriptPromise.catch((error: unknown) => {
    turnstileScriptPromise = null;
    throw error;
  });
  return turnstileScriptPromise;
}

@Component({
  selector: 'app-turnstile-widget',
  imports: [FormsModule, CheckboxModule],
  templateUrl: './turnstile-widget.html',
  styleUrl: './turnstile-widget.scss',
})
export class TurnstileWidget implements OnChanges, OnDestroy {
  readonly tokenChanged = output<string>();
  readonly error = signal('');
  readonly confirmed = signal(false);
  @Input() active = true;
  private readonly widget = viewChild.required<ElementRef<HTMLElement>>('widget');
  private widgetId: string | null = null;
  private starting = false;
  private destroyed = false;
  private readonly siteKey =
    typeof window === 'undefined' ? '' : (window.SINGLESPLANS_CONFIG?.turnstileSiteKey?.trim() ?? '');

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['active']) return;
    if (this.active) {
      this.confirmed.set(false);
    } else {
      this.reset();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.removeWidget();
  }

  onHumanChecked(checked: boolean): void {
    this.confirmed.set(checked);
    if (!checked) {
      this.reset();
      return;
    }
    this.error.set('');
    void this.startVerification();
  }

  reset(): void {
    this.confirmed.set(false);
    this.error.set('');
    this.removeWidget();
  }

  private removeWidget(): void {
    this.tokenChanged.emit('');
    if (this.widgetId) window.turnstile?.remove(this.widgetId);
    this.widgetId = null;
  }

  private async startVerification(): Promise<void> {
    if (this.starting || !this.active || this.destroyed || !this.confirmed()) return;
    if (!this.siteKey) {
      this.error.set('La verificación de seguridad aún no está configurada.');
      this.confirmed.set(false);
      return;
    }

    this.starting = true;
    try {
      await loadTurnstileScript();
      if (!this.active || this.destroyed || !this.confirmed()) return;
      if (!window.turnstile) throw new Error('Turnstile no respondió.');

      if (!this.widgetId) {
        this.widgetId = window.turnstile.render(this.widget().nativeElement, {
          sitekey: this.siteKey,
          theme: 'light',
          appearance: 'execute',
          execution: 'execute',
          retry: 'never',
          'refresh-expired': 'manual',
          callback: (token) => {
            this.error.set('');
            this.tokenChanged.emit(token);
          },
          'expired-callback': () => this.reset(),
          'error-callback': () => {
            this.tokenChanged.emit('');
            this.error.set('No se pudo completar la verificación. Inténtalo de nuevo.');
            this.confirmed.set(false);
            this.removeWidget();
          },
        });
      }
      window.turnstile.execute(this.widgetId);
    } catch {
      this.error.set('No se pudo cargar la verificación de seguridad. Comprueba tu conexión.');
      this.confirmed.set(false);
      this.removeWidget();
    } finally {
      this.starting = false;
    }
  }
}
