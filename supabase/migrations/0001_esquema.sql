-- =============================================================================
-- 0001_esquema.sql
-- Tabelas, indices, triggers e RLS do sistema de convites.
--
-- Como aplicar: Supabase > SQL Editor > New query > cole este arquivo inteiro
-- > Run. O script e idempotente, pode ser executado mais de uma vez.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- EVENTO: tabela de linha unica (id sempre 1).
-- -----------------------------------------------------------------------------
create table if not exists public.event (
  id                smallint     primary key default 1,
  title             text         not null default 'Chá de Bebê',
  starts_at         timestamptz,
  ends_at           timestamptz,
  location_name     text,
  location_address  text,
  notes             text,
  invite_message    text,
  image_path        text,
  image_mime        text,
  image_width       integer,
  image_height      integer,
  palette           jsonb,
  max_companions    smallint     not null default 3,
  timezone          text         not null default 'America/Sao_Paulo',
  updated_at        timestamptz  not null default now(),

  constraint event_linha_unica
    check (id = 1),
  constraint event_max_companions_faixa
    check (max_companions between 0 and 10),
  constraint event_periodo_valido
    check (ends_at is null or starts_at is null or ends_at >= starts_at),
  constraint event_title_tamanho
    check (char_length(btrim(title)) between 1 and 120)
);

comment on table public.event is
  'Dados do unico evento. Sempre exatamente uma linha, com id = 1.';

-- Garante que a linha exista desde o primeiro deploy.
insert into public.event (id) values (1) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- CONVIDADOS: um token proprio por pessoa.
-- -----------------------------------------------------------------------------
create table if not exists public.guests (
  id               uuid         primary key default gen_random_uuid(),
  name             text         not null,
  phone            text,
  token            text         not null,
  first_opened_at  timestamptz,
  last_opened_at   timestamptz,
  open_count       integer      not null default 0,
  confirmed_at     timestamptz,
  declined_at      timestamptz,
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now(),

  constraint guests_name_tamanho
    check (char_length(btrim(name)) between 1 and 80),
  constraint guests_phone_tamanho
    check (phone is null or char_length(phone) between 8 and 20),
  constraint guests_token_formato
    check (token ~ '^[0-9a-z]{10,64}$'),
  constraint guests_resposta_exclusiva
    check (confirmed_at is null or declined_at is null),
  constraint guests_open_count_positivo
    check (open_count >= 0)
);

comment on column public.guests.token is
  'Identificador aleatorio e nao sequencial usado na URL publica /c/[token].';

create unique index if not exists guests_token_idx     on public.guests (token);
create index        if not exists guests_created_at_idx on public.guests (created_at desc);

-- -----------------------------------------------------------------------------
-- ACOMPANHANTES: filhos de um convidado, apagados em cascata.
-- -----------------------------------------------------------------------------
create table if not exists public.companions (
  id         uuid         primary key default gen_random_uuid(),
  guest_id   uuid         not null references public.guests (id) on delete cascade,
  name       text         not null,
  position   smallint     not null default 0,
  created_at timestamptz  not null default now(),

  constraint companions_name_tamanho
    check (char_length(btrim(name)) between 1 and 80),
  constraint companions_position_positiva
    check (position >= 0)
);

create index if not exists companions_guest_id_idx
  on public.companions (guest_id, position);

-- -----------------------------------------------------------------------------
-- RATE LIMIT: contador por janela deslizante, compartilhado entre instancias.
-- Rate limit em memoria nao funciona em serverless, por isso fica no banco.
-- -----------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket        text         primary key,
  contador      integer      not null default 0,
  inicio_janela timestamptz  not null default now()
);

create index if not exists rate_limits_inicio_janela_idx
  on public.rate_limits (inicio_janela);

-- -----------------------------------------------------------------------------
-- TRIGGER de updated_at.
-- -----------------------------------------------------------------------------
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists event_updated_at on public.event;
create trigger event_updated_at
  before update on public.event
  for each row execute function public.tocar_updated_at();

drop trigger if exists guests_updated_at on public.guests;
create trigger guests_updated_at
  before update on public.guests
  for each row execute function public.tocar_updated_at();

-- -----------------------------------------------------------------------------
-- SEGURANCA: RLS ligada em todas as tabelas, sem nenhuma policy.
-- Nenhuma policy significa que anon e authenticated nao enxergam nada.
-- Somente a service role key (que ignora RLS) le e escreve, e ela so e usada
-- no servidor. Os revokes abaixo sao uma segunda camada de defesa.
-- -----------------------------------------------------------------------------
alter table public.event       enable row level security;
alter table public.guests      enable row level security;
alter table public.companions  enable row level security;
alter table public.rate_limits enable row level security;

revoke all on public.event       from anon, authenticated;
revoke all on public.guests      from anon, authenticated;
revoke all on public.companions  from anon, authenticated;
revoke all on public.rate_limits from anon, authenticated;
