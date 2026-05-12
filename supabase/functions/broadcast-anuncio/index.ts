import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { makeCorsHeaders } from "../_shared/cors.ts";

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface BroadcastRequest {
  titulo: string;
  mensaje: string;
  audiencia: 'todos' | 'padres' | 'choferes';
}

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

Deno.serve(async (req) => {
  const corsHeaders = makeCorsHeaders(req);
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Cliente con service role para queries sin RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verificar autenticación del usuario que hace el request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No autorizado');
    }

    const token = authHeader.replace('Bearer ', '');

    // Crear cliente autenticado como el usuario para obtener su identidad
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      throw new Error('No autenticado');
    }

    // Verificar que sea admin (usando service role para bypasear RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.rol !== 'admin') {
      throw new Error('Solo administradores pueden enviar anuncios');
    }

    // Extraer datos del body
    const { titulo, mensaje, audiencia }: BroadcastRequest = await req.json();

    if (!titulo || !mensaje || !audiencia) {
      throw new Error('titulo, mensaje y audiencia son requeridos');
    }

    // 1. Obtener push tokens según audiencia
    let query = supabaseAdmin
      .from('profiles')
      .select('push_token, rol, nombre, apellido');

    switch (audiencia) {
      case 'padres':
        query = query.eq('rol', 'padre');
        break;
      case 'choferes':
        query = query.eq('rol', 'chofer');
        break;
      case 'todos':
        // No filtrar por rol, enviar a todos excepto admin
        query = query.neq('rol', 'admin');
        break;
      default:
        throw new Error('Audiencia inválida. Debe ser: todos, padres o choferes');
    }

    const { data: usuarios, error: usuariosError } = await query;

    if (usuariosError) {
      console.error('Error obteniendo usuarios:', usuariosError);
      throw usuariosError;
    }

    // 2. Filtrar tokens válidos
    const validTokens = (usuarios || [])
      .filter((u: { push_token: string | null }) =>
        u.push_token && u.push_token.startsWith('ExponentPushToken')
      )
      .map((u: { push_token: string }) => u.push_token);

    if (validTokens.length === 0) {
      console.log('No hay tokens válidos para la audiencia seleccionada');
      return new Response(JSON.stringify({
        success: true,
        message: 'No hay dispositivos registrados para esta audiencia',
        sent: 0,
        audiencia,
        total_usuarios: usuarios?.length || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 3. Construir mensajes para Expo Push API
    // Dividir en lotes de 100 (límite de Expo)
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < validTokens.length; i += batchSize) {
      batches.push(validTokens.slice(i, i + batchSize));
    }

    let totalSent = 0;
    let totalFailed = 0;

    // 4. Enviar notificaciones por lotes
    for (const batch of batches) {
      const messages: PushMessage[] = batch.map((token: string) => ({
        to: token,
        title: `📢 ${titulo}`,
        body: mensaje,
        sound: 'default',
        data: {
          tipo: 'anuncio',
          audiencia,
          timestamp: new Date().toISOString(),
        },
        channelId: 'general',
      }));

      const pushResponse = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const pushResult = await pushResponse.json();

      // Contar resultados
      if (pushResult.data) {
        pushResult.data.forEach((ticket: { status: string }) => {
          if (ticket.status === 'ok') {
            totalSent++;
          } else {
            totalFailed++;
          }
        });
      }
    }

    console.log(`Anuncio enviado a ${audiencia}: ${totalSent} éxitos, ${totalFailed} fallos`);

    return new Response(JSON.stringify({
      success: true,
      sent: totalSent,
      failed: totalFailed,
      total_tokens: validTokens.length,
      audiencia,
      batches: batches.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error en broadcast-anuncio:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error desconocido'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
