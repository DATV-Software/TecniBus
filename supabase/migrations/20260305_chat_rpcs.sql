-- ============================================================
-- RPCs CHAT
-- ============================================================

-- RPC: obtener o crear un chat entre padre y chofer para una asignación
create or replace function get_or_create_chat(
  p_id_asignacion uuid,
  p_id_padre      uuid,
  p_id_chofer     uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_chat_id uuid;
begin
  -- Buscar chat existente
  select id into v_chat_id
  from chats
  where id_asignacion = p_id_asignacion
    and id_padre      = p_id_padre
    and id_chofer     = p_id_chofer
  limit 1;

  -- Si no existe, crear
  if v_chat_id is null then
    insert into chats (id_asignacion, id_padre, id_chofer)
    values (p_id_asignacion, p_id_padre, p_id_chofer)
    returning id into v_chat_id;
  end if;

  return v_chat_id;
end;
$$;

-- RPC: listar chats del chofer con resumen (último mensaje, no leídos)
create or replace function get_chats_por_chofer(p_id_chofer uuid)
returns table (
  id_chat        uuid,
  id_asignacion  uuid,
  id_padre       uuid,
  nombre_padre   text,
  ultimo_mensaje text,
  ultima_hora    timestamptz,
  no_leidos      bigint
)
language sql
security definer
as $$
  select
    c.id                                        as id_chat,
    c.id_asignacion,
    c.id_padre,
    p.nombre || ' ' || p.apellido               as nombre_padre,
    (
      select m2.contenido
      from mensajes m2
      where m2.id_chat = c.id
      order by m2.created_at desc
      limit 1
    )                                           as ultimo_mensaje,
    (
      select m3.created_at
      from mensajes m3
      where m3.id_chat = c.id
      order by m3.created_at desc
      limit 1
    )                                           as ultima_hora,
    (
      select count(*)
      from mensajes m4
      where m4.id_chat  = c.id
        and m4.leido    = false
        and m4.id_autor != p_id_chofer
    )                                           as no_leidos
  from chats c
  join profiles p on p.id = c.id_padre
  where c.id_chofer = p_id_chofer
  order by ultima_hora desc nulls last;
$$;
