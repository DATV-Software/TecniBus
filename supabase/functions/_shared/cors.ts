/**
 * CORS helper for Supabase Edge Functions.
 * Reads ALLOWED_ORIGIN env var to restrict cross-origin access.
 * Defaults to the TecniBus Supabase project URL.
 */
export function makeCorsHeaders(_req: Request) {
  const allowed =
    Deno.env.get('ALLOWED_ORIGIN') ?? 'https://qcftgatikpnfuvbtgddd.supabase.co';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
