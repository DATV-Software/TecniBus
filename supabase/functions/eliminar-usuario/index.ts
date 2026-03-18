import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = makeCorsHeaders(req);
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "userId es requerido" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    // 1. Eliminar de tabla específica (choferes o padres)
    const { error: choferError } = await supabaseAdmin
      .from("choferes")
      .delete()
      .eq("id", userId);

    if (choferError) {
      console.log("No era chofer o ya estaba eliminado:", choferError.message);
    }

    const { error: padreError } = await supabaseAdmin
      .from("padres")
      .delete()
      .eq("id", userId);

    if (padreError) {
      console.log("No era padre o ya estaba eliminado:", padreError.message);
    }

    // 2. Eliminar perfil
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      throw new Error(`Error eliminando perfil: ${profileError.message}`);
    }

    // 3. Eliminar usuario de Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      throw new Error(`Error eliminando usuario de auth: ${authError.message}`);
    }

    console.log("✅ Usuario eliminado completamente:", userId);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("❌ Error en eliminar-usuario:", error.message);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message ?? "Error eliminando usuario"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});
