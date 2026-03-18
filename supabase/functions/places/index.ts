import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = makeCorsHeaders(req);
  const jsonResponse = (body: unknown, status: number): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ── Auth: verificar JWT de Supabase ──────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // ── API key (misma que directions) ───────────────────────────────────────
  const apiKey = Deno.env.get("GOOGLE_DIRECTIONS_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { action: string; input?: string; placeId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { action } = body;

  // ── Autocomplete ──────────────────────────────────────────────────────────
  if (action === "autocomplete") {
    const { input } = body;
    if (!input || input.trim().length < 3) {
      return jsonResponse({ predictions: [] }, 200);
    }

    // Cuenca, Ecuador: -2.9001, -79.0059 | radio 30km
    const params = new URLSearchParams({
      input,
      key: apiKey,
      language: "es",
      components: "country:ec",
      location: "-2.9001285,-79.0058965",
      radius: "30000",
      strictbounds: "true",
    });

    let data: Record<string, unknown>;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`,
      );
      data = await res.json();
    } catch {
      return jsonResponse({ error: "Failed to reach Google Places API" }, 502);
    }

    if (data.status === "ZERO_RESULTS") {
      return jsonResponse({ predictions: [] }, 200);
    }
    if (data.status !== "OK") {
      return jsonResponse({ error: `Places API error: ${data.status}` }, 400);
    }

    const predictions = (data.predictions as Array<Record<string, unknown>>).map((p) => {
      const sf = p.structured_formatting as Record<string, string> | undefined;
      return {
        placeId: p.place_id,
        description: p.description,
        mainText: sf?.main_text ?? p.description,
        secondaryText: sf?.secondary_text ?? "",
      };
    });

    return jsonResponse({ predictions }, 200);
  }

  // ── Place Details ─────────────────────────────────────────────────────────
  if (action === "details") {
    const { placeId } = body;
    if (!placeId) {
      return jsonResponse({ error: "placeId is required" }, 400);
    }

    const params = new URLSearchParams({
      place_id: placeId,
      fields: "geometry,formatted_address",
      key: apiKey,
      language: "es",
    });

    let data: Record<string, unknown>;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
      );
      data = await res.json();
    } catch {
      return jsonResponse({ error: "Failed to reach Google Places API" }, 502);
    }

    if (data.status !== "OK") {
      return jsonResponse({ error: `Place Details error: ${data.status}` }, 400);
    }

    const result = data.result as Record<string, unknown>;
    const geometry = result.geometry as Record<string, Record<string, number>>;

    return jsonResponse({
      address: result.formatted_address,
      lat: geometry.location.lat,
      lng: geometry.location.lng,
    }, 200);
  }

  // ── Reverse Geocoding ─────────────────────────────────────────────────────
  if (action === "reverse") {
    const b = body as { action: string; lat?: number; lng?: number };
    if (b.lat === undefined || b.lng === undefined) {
      return jsonResponse({ address: null }, 200);
    }

    const { lat, lng } = b;

    // Intentar Geocoding API primero
    try {
      const params = new URLSearchParams({
        latlng: `${lat},${lng}`,
        key: apiKey,
        language: "es",
        result_type: "street_address|route|neighborhood",
      });

      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
      );
      const data = await res.json() as Record<string, unknown>;

      if (data.status === "OK") {
        const results = data.results as Array<Record<string, unknown>>;
        const address = (results[0]?.formatted_address as string) ?? null;
        return jsonResponse({ address }, 200);
      }

      // Si Geocoding falla (REQUEST_DENIED, etc.), intentar Places Nearby como fallback
      if (data.status === "REQUEST_DENIED" || data.status === "UNKNOWN_ERROR") {
        const nearbyParams = new URLSearchParams({
          location: `${lat},${lng}`,
          radius: "50",
          key: apiKey,
          language: "es",
        });
        const nearbyRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${nearbyParams}`,
        );
        const nearbyData = await nearbyRes.json() as Record<string, unknown>;

        if (nearbyData.status === "OK") {
          const results = nearbyData.results as Array<Record<string, unknown>>;
          const vicinity = results[0]?.vicinity as string | undefined;
          const name = results[0]?.name as string | undefined;
          const address = vicinity ? (name ? `${name}, ${vicinity}` : vicinity) : null;
          return jsonResponse({ address }, 200);
        }
      }
    } catch {
      // Silenciar errores de red — devolver null es suficiente
    }

    return jsonResponse({ address: null }, 200);
  }

  return jsonResponse({ error: "Unknown action. Use 'autocomplete', 'details' or 'reverse'" }, 400);
});
