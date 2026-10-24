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
