import { AfterViewInit, Directive, ElementRef, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import type { GooglePlacePrediction, GooglePlacesLibrary } from '../models/google-maps.types';

let mapsScriptPromise: Promise<void> | undefined;

@Directive({
  selector: '[appGooglePlaceAutocomplete]',
  standalone: true
})
export class GooglePlaceAutocompleteDirective implements AfterViewInit, OnDestroy {
  @Input({ required: true }) googlePlacesApiKey = '';
  @Output() readonly placeSelected = new EventEmitter<{
    name: string;
    address: string;
    placeId: string;
    latitude: number | null;
    longitude: number | null;
  }>();
  @Output() readonly placeError = new EventEmitter<string>();

  private readonly input: HTMLInputElement;
  private readonly suggestions: HTMLDivElement;
  private placesLibrary: GooglePlacesLibrary | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private requestId = 0;
  private activeSuggestion = -1;
  private suppressNextSearch = false;

  constructor(host: ElementRef<HTMLInputElement>) {
    this.input = host.nativeElement;
    this.suggestions = document.createElement('div');
    this.suggestions.id = 'meeting-point-suggestions';
    this.suggestions.className = 'google-places-suggestions';
    this.suggestions.setAttribute('role', 'listbox');
    this.suggestions.hidden = true;
    this.input.parentElement?.append(this.suggestions);
    this.input.addEventListener('input', this.onInput);
    this.input.addEventListener('keydown', this.onKeydown);
    this.suggestions.addEventListener('click', this.onSuggestionClick);
  }

  ngAfterViewInit(): void {
    if (this.googlePlacesApiKey.trim()) void this.initialize();
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounceTimer);
    this.input.removeEventListener('input', this.onInput);
    this.input.removeEventListener('keydown', this.onKeydown);
    this.suggestions.removeEventListener('click', this.onSuggestionClick);
    this.suggestions.remove();
  }

  private async initialize(): Promise<void> {
    try {
      this.placesLibrary = await this.loadPlacesLibrary();
      this.onInput();
    } catch (error) {
      this.placeError.emit(error instanceof Error ? error.message : 'No se pudo cargar Google Places.');
    }
  }

  private readonly onInput = (): void => {
    if (this.suppressNextSearch) {
      this.suppressNextSearch = false;
      this.closeSuggestions();
      return;
    }
    const query = this.input.value.trim();
    const requestId = ++this.requestId;
    clearTimeout(this.debounceTimer);
    if (!query || !this.placesLibrary) {
      this.closeSuggestions();
      return;
    }
    this.debounceTimer = setTimeout(() => void this.fetchSuggestions(query, requestId), 250);
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    const options = this.suggestions.querySelectorAll<HTMLButtonElement>('[role="option"]');
    if (event.key === 'Escape') {
      this.closeSuggestions();
      return;
    }
    if (options.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      this.activeSuggestion = this.activeSuggestion < 0
        ? (direction === 1 ? 0 : options.length - 1)
        : (this.activeSuggestion + direction + options.length) % options.length;
      options.forEach((option, index) => option.setAttribute('aria-selected', String(index === this.activeSuggestion)));
    } else if (event.key === 'Enter' && !this.suggestions.hidden) {
      event.preventDefault();
      options[this.activeSuggestion >= 0 ? this.activeSuggestion : 0].click();
    }
  };

  private readonly onSuggestionClick = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-suggestion-index]');
    if (!button) return;
    const prediction = this.predictions[Number(button.dataset['suggestionIndex'])];
    if (prediction) void this.selectPrediction(prediction);
  };

  private predictions: GooglePlacePrediction[] = [];

  private async fetchSuggestions(query: string, requestId: number): Promise<void> {
    try {
      const response = await this.placesLibrary?.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        includedRegionCodes: ['es']
      });
      if (requestId !== this.requestId || query !== this.input.value.trim()) return;
      this.predictions = (response?.suggestions ?? [])
        .map((suggestion) => suggestion.placePrediction)
        .filter((prediction): prediction is GooglePlacePrediction => !!prediction);
      this.renderSuggestions();
    } catch {
      if (requestId === this.requestId) {
        this.closeSuggestions();
        this.placeError.emit('No se pudieron cargar las sugerencias. Comprueba la clave y la configuración de Google Places.');
      }
    }
  }

  private renderSuggestions(): void {
    this.suggestions.replaceChildren();
    this.activeSuggestion = -1;
    this.predictions.forEach((prediction, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'google-places-suggestion';
      button.dataset['suggestionIndex'] = String(index);
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', 'false');
      const mainText = document.createElement('strong');
      mainText.textContent = prediction.mainText?.text ?? prediction.text.toString();
      button.append(mainText);
      if (prediction.secondaryText?.text) {
        const secondaryText = document.createElement('small');
        secondaryText.textContent = prediction.secondaryText.text;
        button.append(secondaryText);
      }
      this.suggestions.append(button);
    });
    this.suggestions.hidden = this.predictions.length === 0;
    this.input.setAttribute('aria-expanded', String(!this.suggestions.hidden));
  }

  private async selectPrediction(prediction: GooglePlacePrediction): Promise<void> {
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location'] });
      const name = place.displayName?.text?.trim() ?? prediction.mainText?.text?.trim() ?? '';
      const address = place.formattedAddress?.trim() ?? prediction.text.toString().trim();
      if (!name || !address) {
        this.placeError.emit('No se pudo obtener la información del lugar seleccionado.');
        return;
      }
      this.suppressNextSearch = true;
      this.input.value = prediction.text.toString();
      this.input.dispatchEvent(new Event('input', { bubbles: true }));
      this.placeSelected.emit({
        name,
        address,
        placeId: place.id ?? '',
        latitude: place.location?.lat() ?? null,
        longitude: place.location?.lng() ?? null
      });
      this.closeSuggestions();
    } catch {
      this.placeError.emit('No se pudo obtener la ubicación del lugar seleccionado.');
    }
  }

  private closeSuggestions(): void {
    this.suggestions.hidden = true;
    this.suggestions.replaceChildren();
    this.predictions = [];
    this.activeSuggestion = -1;
    this.input.setAttribute('aria-expanded', 'false');
  }

  private async loadPlacesLibrary(): Promise<GooglePlacesLibrary> {
    if (!this.googlePlacesApiKey.trim()) {
      throw new Error('Configura googleMapsApiKey en public/google-maps-config.js para activar la búsqueda de lugares.');
    }
    if (!window.google?.maps?.importLibrary) {
      mapsScriptPromise ??= this.loadMapsScript();
      await mapsScriptPromise;
    }
    const importLibrary = window.google?.maps?.importLibrary;
    if (!importLibrary) throw new Error('Google Maps no está disponible. Comprueba la clave y la API de Places.');
    return importLibrary.call(window.google?.maps, 'places');
  }

  private loadMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(this.googlePlacesApiKey)}&v=weekly&libraries=places&loading=async`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        mapsScriptPromise = undefined;
        script.remove();
        reject(new Error('Google Maps no se pudo cargar. Comprueba la clave, la facturación y las restricciones del dominio.'));
      };
      document.head.appendChild(script);
    });
  }
}
