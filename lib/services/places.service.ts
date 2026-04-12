import { supabase } from "./supabase";

export type PlaceSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type PlaceDetails = {
  address: string;
  lat: number;
  lng: number;
};

/**
 * Retorna sugerencias de autocompletado para una búsqueda de texto.
 * Llama a la Edge Function 'places' que protege la API key en el servidor.
 */
export async function searchPlaceSuggestions(query: string): Promise<PlaceSuggestion[]> {
  if (!query.trim() || query.trim().length < 3) return [];

  const { data, error } = await supabase.functions.invoke<{ predictions: PlaceSuggestion[] }>(
    "places",
    { body: { action: "autocomplete", input: query } },
  );

  if (error || !data?.predictions) {
    return [];
  }

  return data.predictions;
}

/**
 * Reverse geocoding: obtiene dirección legible a partir de coordenadas.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<{ address: string | null }>(
    "places",
    { body: { action: "reverse", lat, lng } },
  );

  if (error || data === null) {
    return null;
  }

  return data.address;
}

/**
 * Obtiene dirección formateada y coordenadas a partir de un place_id.
 * Llama a la Edge Function 'places' que protege la API key en el servidor.
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const { data, error } = await supabase.functions.invoke<PlaceDetails>(
    "places",
    { body: { action: "details", placeId } },
  );

  if (error || !data?.lat) {
    return null;
  }

  return data;
}
