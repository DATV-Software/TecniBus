import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeCorsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  origin: string;
  destination: string;
  waypoints?: string;
  optimize?: boolean;
}

interface DirectionsResponseBody {
  polyline: string;
  duration: number;
  distance: number;
  legs: Array<{ distance: number; duration: number }>;
  waypointOrder?: number[];
}

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

  // ── Auth: verify Supabase JWT ──────────────────────────────────────────────
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

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { origin, destination, waypoints, optimize = false } = body;

  if (!origin || typeof origin !== "string") {
    return jsonResponse({ error: "origin is required and must be a string" }, 400);
  }
  if (!destination || typeof destination !== "string") {
    return jsonResponse({ error: "destination is required and must be a string" }, 400);
  }

  // ── Build Google Directions request ───────────────────────────────────────
  const apiKey = Deno.env.get("GOOGLE_DIRECTIONS_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  const params = new URLSearchParams({
    origin,
    destination,
    mode: "driving",
    key: apiKey,
  });

  if (waypoints) {
    params.set("waypoints", optimize ? `optimize:true|${waypoints}` : waypoints);
  }

  const googleUrl = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;

  let googleData: Record<string, unknown>;
  try {
    const googleRes = await fetch(googleUrl);
    if (!googleRes.ok) {
      return jsonResponse({ error: "Failed to reach Google Directions API" }, 502);
    }
    googleData = await googleRes.json();
  } catch {
    return jsonResponse({ error: "Failed to reach Google Directions API" }, 502);
  }

  // ── Validate Google response ──────────────────────────────────────────────
  const googleStatus = googleData.status as string;

  if (googleStatus === "REQUEST_DENIED") {
    return jsonResponse({ error: "Directions API authorization failed" }, 401);
  }

  if (
    googleStatus !== "OK" ||
    !Array.isArray(googleData.routes) ||
    googleData.routes.length === 0
  ) {
    return jsonResponse({ error: `Directions API error: ${googleStatus}` }, 400);
  }

  // ── Extract and return minimal payload ────────────────────────────────────
  const route = (googleData.routes as Array<Record<string, unknown>>)[0];
  const overviewPolyline = route.overview_polyline as Record<string, string>;
  const polyline: string = overviewPolyline.points;

  const routeLegs = route.legs as Array<Record<string, Record<string, number>>>;
  let totalDistance = 0;
  let totalDuration = 0;
  const legs: Array<{ distance: number; duration: number }> = [];

  for (const leg of routeLegs) {
    totalDistance += leg.distance.value;
    totalDuration += leg.duration.value;
    legs.push({ distance: leg.distance.value, duration: leg.duration.value });
  }

  const waypointOrder: number[] | undefined =
    optimize && Array.isArray(route.waypoint_order)
      ? (route.waypoint_order as number[])
      : undefined;

  const responseBody: DirectionsResponseBody = {
    polyline,
    duration: totalDuration,
    distance: totalDistance,
    legs,
    ...(waypointOrder !== undefined && { waypointOrder }),
  };

  return jsonResponse(responseBody, 200);
});
