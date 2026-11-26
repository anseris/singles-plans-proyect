export interface GooglePlaceLocation {
  lat(): number;
  lng(): number;
}

export interface GooglePlace {
  id?: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: GooglePlaceLocation;
  fetchFields(options: { fields: string[] }): Promise<void>;
}

export interface GooglePlacePrediction {
  text: { toString(): string };
  mainText?: { text: string };
  secondaryText?: { text: string };
  toPlace(): GooglePlace;
}

export interface GooglePlaceAutocompleteSuggestion {
  placePrediction?: GooglePlacePrediction;
}

export interface GooglePlacesLibrary {
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(request: {
      input: string;
      includedRegionCodes: string[];
    }): Promise<{ suggestions: GooglePlaceAutocompleteSuggestion[] }>;
  };
}

export interface GoogleMapsApi {
  importLibrary(name: 'places'): Promise<GooglePlacesLibrary>;
}

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
    turnstile?: {
      render(
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback': () => void;
          'error-callback': () => void;
          theme?: 'light' | 'dark' | 'auto';
          appearance?: 'always' | 'execute' | 'interaction-only';
          execution?: 'render' | 'execute';
          retry?: 'auto' | 'never';
          'refresh-expired'?: 'auto' | 'manual' | 'never';
        },
      ): string;
      execute(widgetId?: string): void;
      reset(widgetId?: string): void;
      remove(widgetId: string): void;
    };
    SINGLESPLANS_CONFIG?: {
      googleMapsApiKey?: string;
      turnstileSiteKey?: string;
      apiOrigin?: string;
    };
  }
}
