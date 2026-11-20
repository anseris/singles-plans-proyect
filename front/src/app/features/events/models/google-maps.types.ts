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
    SINGLESPLANS_CONFIG?: { googleMapsApiKey?: string };
  }
}
