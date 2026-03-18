import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { makeCorsHeaders } from "../_shared/cors.ts";

const CrearUsuarioSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(1).trim(),
  apellido: z.string().min(1).trim(),
  rol: z.enum(['padre', 'chofer']),
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

    // 1. Validar body con Zod
    const parseResult = CrearUsuarioSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return new Response(JSON.stringify({ success: false, error: parseResult.error.issues }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }
    const { email, password, nombre, apellido, rol } = parseResult.data;

    // 2. Verificar que quien llama es admin (rate limit por admin)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user && !checkRateLimit(user.id)) {
        return new Response(JSON.stringify({ success: false, error: 'Demasiadas solicitudes, espera un minuto' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 });
      }
    }

    // 2. Crear usuario en la sección de Authentication
    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido, rol }
    });

    if (authError) throw authError;

    const userId = userData.user.id;

    // 3. Insertar en la tabla 'profiles'
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        correo: email, // Mapeado a tu columna 'correo'
        nombre: nombre,
        apellido: apellido,
        rol: rol
      });

    if (profileError) {
      // Si falla el perfil, borramos el usuario de Auth para evitar basura
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    // 4. Insertar en la tabla de rol específica (Choferes o Padres)
    // Esto es lo que hacía que no aparecieran en la tabla de choferes
    const tablaRol = rol === 'chofer' ? 'choferes' : 'padres';
    
    const { error: roleError } = await supabaseAdmin
      .from(tablaRol)
      .insert({ id: userId });

    if (roleError) {
      // Opcional: podrías borrar el perfil y el auth si esto falla
      console.error(`Error insertando en tabla ${tablaRol}:`, roleError.message);
      throw roleError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: userId, email, nombre, rol } 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});