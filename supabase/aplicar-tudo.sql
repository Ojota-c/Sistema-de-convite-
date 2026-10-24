-- =============================================================================
-- aplicar-tudo.sql
--
-- ARQUIVO GERADO. Nao edite aqui: mexa nos arquivos de supabase/migrations/
-- e rode `npm run sql` para regerar.
--
-- Junta 3 migrations em uma colagem so, para a primeira
-- instalacao ser mais rapida:
--   - 0001_esquema.sql
--   - 0002_funcoes.sql
--   - 0003_storage.sql
--
-- Como aplicar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Pode rodar mais de uma vez sem estragar nada.
-- =============================================================================

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


-- =============================================================================
-- 0002_funcoes.sql
-- Funcoes chamadas via RPC pelo servidor. Existem por dois motivos:
--   1. transacionalidade (confirmar presenca mexe em duas tabelas);
--   2. operacoes que o cliente JS nao expressa (incremento atomico de contador).
--
-- Todas sao SECURITY INVOKER (o padrao). O EXECUTE e revogado de PUBLIC,
-- anon e authenticated, e concedido apenas a service_role, que e a unica
-- identidade usada pelo servidor.
--
-- Como aplicar: Supabase > SQL Editor > New query > cole este arquivo > Run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- registrar_abertura: incremento atomico do contador de aberturas.
-- Chamada apenas pelo navegador do convidado, depois que a pagina monta.
-- -----------------------------------------------------------------------------
create or replace function public.registrar_abertura(p_token text)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_primeira timestamptz;
  v_ultima   timestamptz;
  v_total    integer;
begin
  update public.guests
     set first_opened_at = coalesce(first_opened_at, now()),
         last_opened_at  = now(),
         open_count      = open_count + 1
   where token = p_token
  returning first_opened_at, last_opened_at, open_count
       into v_primeira, v_ultima, v_total;

  if not found then
    return jsonb_build_object('ok', false, 'erro', 'convidado_nao_encontrado');
  end if;

  return jsonb_build_object(
    'ok', true,
    'first_opened_at', v_primeira,
    'last_opened_at', v_ultima,
    'open_count', v_total
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- confirmar_presenca: idempotente e transacional.
-- Chamar de novo apenas atualiza o nome e a lista de acompanhantes; a data da
-- primeira confirmacao e preservada.
-- -----------------------------------------------------------------------------
create or replace function public.confirmar_presenca(
  p_token         text,
  p_nome          text,
  p_acompanhantes text[]
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_guest_id   uuid;
  v_max        smallint;
  v_total      integer;
  v_confirmado timestamptz;
begin
  select max_companions into v_max from public.event where id = 1;
  v_max  := coalesce(v_max, 3);
  v_total := coalesce(array_length(p_acompanhantes, 1), 0);

  if v_total > v_max then
    return jsonb_build_object('ok', false, 'erro', 'limite_acompanhantes');
  end if;

  -- Trava a linha do convidado ate o fim da transacao, para que dois envios
  -- simultaneos nao embaralhem a lista de acompanhantes.
  select id into v_guest_id
    from public.guests
   where token = p_token
     for update;

  if v_guest_id is null then
    return jsonb_build_object('ok', false, 'erro', 'convidado_nao_encontrado');
  end if;

  update public.guests
     set name         = p_nome,
         confirmed_at = coalesce(confirmed_at, now()),
         declined_at  = null
   where id = v_guest_id
  returning confirmed_at into v_confirmado;

  delete from public.companions where guest_id = v_guest_id;

  if v_total > 0 then
    insert into public.companions (guest_id, name, position)
    select v_guest_id, item.nome, (item.ord - 1)::smallint
      from unnest(p_acompanhantes) with ordinality as item(nome, ord);
  end if;

  return jsonb_build_object(
    'ok', true,
    'guest_id', v_guest_id,
    'name', p_nome,
    'confirmed_at', v_confirmado,
    'companions', coalesce(p_acompanhantes, array[]::text[])
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- recusar_convite: marca a recusa e limpa acompanhantes, tambem idempotente.
-- -----------------------------------------------------------------------------
create or replace function public.recusar_convite(
  p_token text,
  p_nome  text
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_guest_id  uuid;
  v_recusado  timestamptz;
begin
  select id into v_guest_id
    from public.guests
   where token = p_token
     for update;

  if v_guest_id is null then
    return jsonb_build_object('ok', false, 'erro', 'convidado_nao_encontrado');
  end if;

  update public.guests
     set name         = p_nome,
         declined_at  = coalesce(declined_at, now()),
         confirmed_at = null
   where id = v_guest_id
  returning declined_at into v_recusado;

  delete from public.companions where guest_id = v_guest_id;

  return jsonb_build_object(
    'ok', true,
    'guest_id', v_guest_id,
    'name', p_nome,
    'declined_at', v_recusado
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- rl_consumir: rate limit por janela deslizante.
-- Devolve true quando a requisicao esta dentro do limite.
-- -----------------------------------------------------------------------------
create or replace function public.rl_consumir(
  p_bucket          text,
  p_limite          integer,
  p_janela_segundos integer
)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_agora    timestamptz := now();
  v_contador integer;
begin
  insert into public.rate_limits as rl (bucket, contador, inicio_janela)
  values (p_bucket, 1, v_agora)
  on conflict (bucket) do update
     set contador = case
           when rl.inicio_janela < v_agora - make_interval(secs => p_janela_segundos)
             then 1
           else rl.contador + 1
         end,
         inicio_janela = case
           when rl.inicio_janela < v_agora - make_interval(secs => p_janela_segundos)
             then v_agora
           else rl.inicio_janela
         end
  returning rl.contador into v_contador;

  -- Limpeza oportunista para a tabela nao crescer sem fim.
  if random() < 0.01 then
    delete from public.rate_limits
     where inicio_janela < v_agora - interval '1 day';
  end if;

  return v_contador <= p_limite;
end;
$$;

-- -----------------------------------------------------------------------------
-- PERMISSOES: ninguem alem da service role executa estas funcoes.
-- -----------------------------------------------------------------------------
revoke all on function public.registrar_abertura(text)            from public, anon, authenticated;
revoke all on function public.confirmar_presenca(text, text, text[]) from public, anon, authenticated;
revoke all on function public.recusar_convite(text, text)         from public, anon, authenticated;
revoke all on function public.rl_consumir(text, integer, integer) from public, anon, authenticated;
revoke all on function public.tocar_updated_at()                  from public, anon, authenticated;

grant execute on function public.registrar_abertura(text)            to service_role;
grant execute on function public.confirmar_presenca(text, text, text[]) to service_role;
grant execute on function public.recusar_convite(text, text)         to service_role;
grant execute on function public.rl_consumir(text, integer, integer) to service_role;


-- =============================================================================
-- 0003_storage.sql
-- Bucket privado para a imagem do convite.
--
-- O bucket e PRIVADO de proposito. A imagem chega ao navegador do convidado
-- pela rota /c/[token]/imagem, que le o arquivo no servidor com a service role
-- e o devolve com cache. Assim nenhuma URL publica do Storage e exposta e a
-- previa do WhatsApp continua funcionando.
--
-- Como aplicar: Supabase > SQL Editor > New query > cole este arquivo > Run.
-- Se preferir a interface: Storage > New bucket > nome "convite" > deixe
-- "Public bucket" DESLIGADO > limite de 5 MB > tipos image/jpeg, image/png,
-- image/webp.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'convite',
  'convite',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
   set public             = excluded.public,
       file_size_limit    = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types;

-- Nenhuma policy em storage.objects para este bucket: somente a service role
-- (que ignora RLS) consegue ler e gravar.
