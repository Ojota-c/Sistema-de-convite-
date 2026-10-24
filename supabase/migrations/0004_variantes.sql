-- =============================================================================
-- 0004_variantes.sql
-- Variantes do convite.
--
-- O mesmo evento pode ter mais de uma arte, iguais em tudo menos num detalhe.
-- No Chá da Flora sao tres, que mudam so o tamanho da fralda sugerida: P, M
-- e G. Cada convidado recebe uma delas.
--
-- A arte fica aqui, e nao em colunas novas na tabela event, porque o numero de
-- variantes muda sem aviso: hoje sao tres tamanhos de fralda, amanha pode ser
-- outra divisao qualquer. Acrescentar uma linha nao exige migration nova.
--
-- Como aplicar: Supabase > SQL Editor > New query > cole este arquivo > Run.
-- O script e idempotente, pode rodar mais de uma vez.
-- =============================================================================

create table if not exists public.invite_variants (
  code         text         primary key,
  descricao    text         not null,
  posicao      smallint     not null default 0,
  image_path   text,
  image_mime   text,
  image_width  integer,
  image_height integer,
  palette      jsonb,
  updated_at   timestamptz  not null default now(),

  constraint invite_variants_code_formato
    check (code ~ '^[A-Za-z0-9]{1,8}$'),
  constraint invite_variants_descricao_tamanho
    check (char_length(btrim(descricao)) between 1 and 80)
);

comment on table public.invite_variants is
  'Artes do convite. Cada convidado aponta para uma delas pela coluna variant_code.';

create index if not exists invite_variants_posicao_idx
  on public.invite_variants (posicao, code);

-- As tres variantes do evento. A arte de cada uma e enviada pelo painel.
insert into public.invite_variants (code, descricao, posicao) values
  ('P', 'Fraldas tamanho P', 0),
  ('M', 'Fraldas tamanho M', 1),
  ('G', 'Fraldas tamanho G', 2)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Convidado aponta para a variante que vai receber.
-- Nulo significa "ainda nao definida", e nesse caso a pagina do convidado cai
-- na imagem geral do evento. Assim nenhum convite fica quebrado enquanto o
-- organizador nao terminar de distribuir os tamanhos.
-- -----------------------------------------------------------------------------
alter table public.guests
  add column if not exists variant_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'guests_variant_code_fkey'
  ) then
    alter table public.guests
      add constraint guests_variant_code_fkey
      foreign key (variant_code) references public.invite_variants (code)
      on update cascade on delete set null;
  end if;
end
$$;

create index if not exists guests_variant_code_idx
  on public.guests (variant_code);

-- -----------------------------------------------------------------------------
-- Mesma politica das demais tabelas: RLS ligada, nenhuma policy, acesso
-- exclusivo da service role usada no servidor.
-- -----------------------------------------------------------------------------
alter table public.invite_variants enable row level security;

revoke all on public.invite_variants from anon, authenticated;

drop trigger if exists invite_variants_updated_at on public.invite_variants;
create trigger invite_variants_updated_at
  before update on public.invite_variants
  for each row execute function public.tocar_updated_at();
