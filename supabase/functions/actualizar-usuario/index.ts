import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

    const { userId, nombre, apellido, correo, password } = await req.json();
    if (!userId) throw new Error('userId es requerido');

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
