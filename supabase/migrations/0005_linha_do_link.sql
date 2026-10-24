-- =============================================================================
-- 0005_linha_do_link.sql
-- Onde escrever o endereco dentro da arte do convite.
--
-- A arte traz um campo em branco com "clique aqui para confirmar" e um filete
-- embaixo. Quem quiser mandar a foto do convite junto com a mensagem pode
-- baixar, pelo painel, uma copia da arte com o endereco do convidado escrito
-- nesse filete.
--
-- A posicao fica guardada, e nao e deduzida dos pixels. Tentar achar o filete
-- varrendo a imagem nao funciona: a arte tem tres tracados largos na metade
-- de baixo, a borda da caixa do "clique aqui", o filete de dentro dela e a
-- borda da caixa do churrasco. Os tres sao iguais aos olhos do computador.
--
-- O padrao abaixo ja e a medicao da arte do Chá da Flora, entao funciona sem
-- ninguem precisar configurar nada. Os campos ficam ajustaveis no painel para
-- o caso de a arte mudar.
--
-- Como aplicar: Supabase > SQL Editor > New query > cole este arquivo > Run.
-- O script e idempotente.
-- =============================================================================

alter table public.event
  add column if not exists link_na_arte jsonb
  not null
  default '{"y": 0.835, "inicio": 0.253, "fim": 0.818}'::jsonb;

comment on column public.event.link_na_arte is
  'Posicao do filete onde o endereco e escrito, em fracoes da largura e da altura da arte.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'event_link_na_arte_coerente'
  ) then
    alter table public.event
      add constraint event_link_na_arte_coerente check (
        (link_na_arte ->> 'y')::numeric between 0 and 1
        and (link_na_arte ->> 'inicio')::numeric between 0 and 1
        and (link_na_arte ->> 'fim')::numeric between 0 and 1
        and (link_na_arte ->> 'fim')::numeric > (link_na_arte ->> 'inicio')::numeric
      );
  end if;
end
$$;
