import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { makeCorsHeaders } from "../_shared/cors.ts";

const ActualizarUsuarioSchema = z.object({
  userId: z.string().uuid(),
  nombre: z.string().min(1).trim().optional(),
  apellido: z.string().min(1).trim().optional(),
  correo: z.string().email().optional(),
  password: z.string().min(8).optional(),
}).refine(d => d.nombre || d.apellido || d.correo || d.password, {
  message: 'Se requiere al menos un campo para actualizar',
});

// Per-isolate rate limiter: 20 req/min per userId
const rateLimitMap = new Map<string, number[]>();
function checkRateLimit(userId: string, maxPerMinute = 20): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) ?? []).filter(t => now - t < 60_000);
  if (timestamps.length >= maxPerMinute) return false;
  rateLimitMap.set(userId, [...timestamps, now]);
  return true;
}

Deno.serve(async (req) => {
  const corsHeaders = makeCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verificar que quien llama es admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No autorizado');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('No autenticado');

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (profile?.rol !== 'admin') throw new Error('Solo administradores pueden modificar usuarios');

    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ success: false, error: 'Demasiadas solicitudes, espera un minuto' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 });
    }

    const parseResult = ActualizarUsuarioSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return new Response(JSON.stringify({ success: false, error: parseResult.error.issues }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }
    const { userId, nombre, apellido, correo, password } = parseResult.data;

    // 1. Actualizar auth.users si cambia correo o contraseña
    const authUpdates: Record<string, string> = {};
    if (correo) authUpdates.email = correo;
    if (password) authUpdates.password = password;

    if (Object.keys(authUpdates).length > 0) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        authUpdates,
      );
      if (updateAuthError) {
        throw new Error(`Error actualizando credenciales: ${updateAuthError.message}`);
      }
    }

    // 2. Actualizar profiles
    const profileUpdates: Record<string, string> = {};
    if (nombre) profileUpdates.nombre = nombre.trim();
    if (apellido !== undefined) profileUpdates.apellido = apellido.trim();
    if (correo) profileUpdates.correo = correo.trim();

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId);

      if (profileError) throw new Error(`Error actualizando perfil: ${profileError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
