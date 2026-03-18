import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeCorsHeaders } from "../_shared/cors.ts";

// URL del servicio de Expo Push
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

interface PushResult {
  success: boolean;
  sent: number;
  failed: number;
  tokens: string[];
}

Deno.serve(async (req) => {
  const corsHeaders = makeCorsHeaders(req);
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Crear cliente de Supabase con service role para bypassear RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Extraer datos del body
    const { id_asignacion, titulo, mensaje, data } = await req.json();

    if (!id_asignacion) {
      throw new Error('id_asignacion es requerido');
    }

    // Obtener push tokens de padres asociados a la ruta
    const { data: padresData, error: padresError } = await supabaseAdmin.rpc(
      'get_push_tokens_padres_ruta',
      { p_id_asignacion: id_asignacion }
    );

    if (padresError) {
      console.error('Error obteniendo push tokens:', padresError);
      throw padresError;
    }

    // Filtrar tokens válidos de Expo (empiezan con ExponentPushToken)
    const validTokens = (padresData || [])
      .filter((p: { push_token: string }) =>
        p.push_token && p.push_token.startsWith('ExponentPushToken')
      )
      .map((p: { push_token: string }) => p.push_token);

    if (validTokens.length === 0) {
      console.log('No hay tokens válidos para enviar notificaciones');
      return new Response(JSON.stringify({
        success: true,
        message: 'No hay dispositivos registrados para esta ruta',
        sent: 0,
        tokens: []
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Construir mensajes para Expo Push API
    const messages: PushMessage[] = validTokens.map((token: string) => ({
      to: token,
      title: titulo || 'TecniBus',
      body: mensaje || 'La buseta ha iniciado el recorrido',
      sound: 'default',
      data: data || {},
      channelId: 'recorrido', // Canal de Android para notificaciones de recorrido
    }));

    // Enviar notificaciones a Expo Push API
    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const pushResult = await pushResponse.json();

    // Contar éxitos y fallos
    let sent = 0;
    let failed = 0;

    if (pushResult.data) {
      pushResult.data.forEach((ticket: { status: string }) => {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          failed++;
        }
      });
    }

    console.log(`Notificaciones enviadas: ${sent} éxitos, ${failed} fallos`);

    const result: PushResult = {
      success: true,
      sent,
      failed,
      tokens: validTokens,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error en send-push-notification:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error desconocido'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
