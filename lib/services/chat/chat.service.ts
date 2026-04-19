import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../core/supabase';

export interface Mensaje {
  id: string;
  id_chat: string;
  id_autor: string;
  rol_autor: 'padre' | 'chofer';
  tipo: 'quick' | 'custom';
  contenido: string;
  leido: boolean;
  created_at: string;
}

export interface ChatResumen {
  id_chat: string;
  id_asignacion: string;
  id_padre: string;
  nombre_padre: string;
  ultimo_mensaje: string | null;
  ultima_hora: string | null;
  no_leidos: number;
}

export async function getOrCreateChat(
  idAsignacion: string,
  idPadre: string,
  idChofer: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_or_create_chat', {
    p_id_asignacion: idAsignacion,
    p_id_padre: idPadre,
    p_id_chofer: idChofer,
  });
  if (error) {
    return null;
  }
  return data as string;
}

export async function getMensajes(idChat: string): Promise<Mensaje[]> {
  const { data, error } = await supabase
    .from('mensajes')
    .select('*')
    .eq('id_chat', idChat)
    .order('created_at', { ascending: true });
  if (error) {
    return [];
  }
  return (data ?? []) as Mensaje[];
}

export async function enviarMensaje(
  idChat: string,
  idAutor: string,
  rolAutor: 'padre' | 'chofer',
  contenido: string,
  tipo: 'quick' | 'custom' = 'custom',
): Promise<boolean> {
  const { error } = await supabase.from('mensajes').insert({
    id_chat: idChat,
    id_autor: idAutor,
    rol_autor: rolAutor,
    tipo,
    contenido,
  });
  if (error) {
    return false;
  }
  return true;
}

export async function marcarLeidos(idChat: string, idAutor: string): Promise<void> {
  const { error } = await supabase
    .from('mensajes')
    .update({ leido: true })
    .eq('id_chat', idChat)
    .eq('leido', false)
    .neq('id_autor', idAutor);
  if (error) {
  }
}

export function suscribirseAMensajes(
  idChat: string,
  onNuevoMensaje: (msg: Mensaje) => void,
): RealtimeChannel {
  return supabase
    .channel(`chat:${idChat}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes',
        filter: `id_chat=eq.${idChat}`,
      },
      (payload) => {
        onNuevoMensaje(payload.new as Mensaje);
      },
    )
    .subscribe();
}

export async function getChatsPorChofer(idChofer: string): Promise<ChatResumen[]> {
  const { data, error } = await supabase.rpc('get_chats_por_chofer', {
    p_id_chofer: idChofer,
  });
  if (error) {
    return [];
  }
  return ((data ?? []) as ChatResumen[]);
}

export async function isRecorridoActivo(idAsignacion: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('estados_recorrido')
    .select('activo')
    .eq('id_asignacion', idAsignacion)
    .eq('activo', true)
    .maybeSingle();
  if (error) {
    return false;
  }
  return data !== null;
}
