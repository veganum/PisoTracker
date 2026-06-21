-- ============================================================================
--  PisoTracker · Esquema de persistencia en Supabase
-- ----------------------------------------------------------------------------
--  Almacén CLAVE-VALOR por usuario. Cada fila guarda una "colección" del estado
--  de la app (pisos, contactos, guion, tema) como JSON, aislada por usuario
--  mediante RLS. Refleja el puerto `StoragePort` (cargar/guardar/borrar por
--  clave), de modo que el front no necesita conocer el esquema.
--
--  Cómo aplicarlo: Supabase → SQL Editor → New query → pega esto → Run.
--  Es idempotente (se puede ejecutar varias veces sin romper nada).
-- ============================================================================

create table if not exists public.estado (
  user_id        uuid not null references auth.users (id) on delete cascade default auth.uid(),
  clave          text not null,
  valor          jsonb,
  actualizado_en timestamptz not null default now(),
  primary key (user_id, clave)
);

-- Seguridad a nivel de fila: imprescindible (la anon key es pública).
alter table public.estado enable row level security;

-- Cada usuario solo puede ver/crear/editar/borrar SUS propias filas.
drop policy if exists "estado_select_propio" on public.estado;
drop policy if exists "estado_insert_propio" on public.estado;
drop policy if exists "estado_update_propio" on public.estado;
drop policy if exists "estado_delete_propio" on public.estado;

create policy "estado_select_propio" on public.estado
  for select using (auth.uid() = user_id);
create policy "estado_insert_propio" on public.estado
  for insert with check (auth.uid() = user_id);
create policy "estado_update_propio" on public.estado
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "estado_delete_propio" on public.estado
  for delete using (auth.uid() = user_id);

-- NOTA: nunca uses la `service_role` key en el frontend. La seguridad depende
-- de estas políticas RLS + la `anon` key (que es pública por diseño).
