-- ============================================================
-- CHAT PADRES–CHOFER
-- Tablas: chats, mensajes
-- RLS habilitado en ambas
-- ============================================================

-- Tabla chats: una por (asignacion, padre, chofer)
create table if not exists chats (
  id           uuid primary key default gen_random_uuid(),
  id_asignacion uuid not null,
  id_padre     uuid not null references profiles(id) on delete cascade,
  id_chofer    uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  unique (id_asignacion, id_padre, id_chofer)
);

-- Tabla mensajes: mensajes de cada chat
create table if not exists mensajes (
  id         uuid primary key default gen_random_uuid(),
  id_chat    uuid not null references chats(id) on delete cascade,
  id_autor   uuid not null references profiles(id) on delete cascade,
  rol_autor  text not null check (rol_autor in ('padre', 'chofer')),
  tipo       text not null default 'custom' check (tipo in ('quick', 'custom')),
  contenido  text not null,
  leido      boolean not null default false,
  created_at timestamptz default now()
);

-- Índices de rendimiento
create index if not exists idx_mensajes_id_chat   on mensajes(id_chat);
create index if not exists idx_mensajes_created_at on mensajes(id_chat, created_at asc);
create index if not exists idx_chats_padre        on chats(id_padre);
create index if not exists idx_chats_chofer       on chats(id_chofer);

-- ============================================================
-- RLS
-- ============================================================
alter table chats    enable row level security;
alter table mensajes enable row level security;

-- chats: padre o chofer pueden ver sus conversaciones
create policy "chat_select_participantes"
  on chats for select
  using (auth.uid() = id_padre or auth.uid() = id_chofer);

-- chats: solo el sistema (RPC) puede insertar
create policy "chat_insert_participantes"
  on chats for insert
  with check (auth.uid() = id_padre or auth.uid() = id_chofer);

-- mensajes: solo remitente o destinatario ven sus mensajes
create policy "mensajes_select_participantes"
  on mensajes for select
  using (
    exists (
      select 1 from chats c
      where c.id = mensajes.id_chat
        and (auth.uid() = c.id_padre or auth.uid() = c.id_chofer)
    )
  );

-- mensajes: solo el autor puede insertar
create policy "mensajes_insert_autor"
  on mensajes for insert
  with check (auth.uid() = id_autor);

-- mensajes: solo puede actualizar el campo leido quien los recibe
create policy "mensajes_update_leido"
  on mensajes for update
  using (
    exists (
      select 1 from chats c
      where c.id = mensajes.id_chat
        and (auth.uid() = c.id_padre or auth.uid() = c.id_chofer)
    )
  );

-- ============================================================
-- Habilitar realtime en mensajes
-- ============================================================
alter publication supabase_realtime add table mensajes;
