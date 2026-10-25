import 'server-only';

import { cache } from 'react';

import { paraData } from '@/lib/datas';
import { statusDoConvidado } from '@/lib/painel';
import { gerarToken } from '@/lib/token';
import type { AcompanhanteRow, ConvidadoRow, RespostaRpc } from '@/types/db';
import type { Convidado } from '@/types/dominio';

import { supabase } from './supabase';

/**
 * Acesso aos convidados e aos acompanhantes.
 *
 * As operacoes que mexem em duas tabelas ao mesmo tempo (confirmar e recusar)
 * passam por funcoes do Postgres, para acontecerem dentro de uma transacao.
 */

const COLUNAS_DO_CONVIDADO =
  'id, name, phone, token, first_opened_at, last_opened_at, open_count, confirmed_at, declined_at, variant_code, created_at, updated_at';

type LinhaComAcompanhantes = ConvidadoRow & {
  companions: AcompanhanteRow[] | null;
};

function paraDominio(linha: LinhaComAcompanhantes): Convidado {
  const marcas = {
    primeiraAberturaEm: paraData(linha.first_opened_at),
    confirmadoEm: paraData(linha.confirmed_at),
    recusadoEm: paraData(linha.declined_at),
  };

  return {
    id: linha.id,
    nome: linha.name,
    telefone: linha.phone,
    token: linha.token,
    primeiraAberturaEm: marcas.primeiraAberturaEm,
    ultimaAberturaEm: paraData(linha.last_opened_at),
    totalDeAberturas: linha.open_count,
    confirmadoEm: marcas.confirmadoEm,
    recusadoEm: marcas.recusadoEm,
    criadoEm: paraData(linha.created_at) ?? new Date(0),
    acompanhantes: (linha.companions ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((a) => ({ id: a.id, nome: a.name, posicao: a.position })),
    status: statusDoConvidado(marcas),
    variante: linha.variant_code,
  };
}

/** Lista completa, com os acompanhantes, para o painel. */
export async function listarConvidados(): Promise<Convidado[]> {
  const { data, error } = await supabase()
    .from('guests')
    .select(`${COLUNAS_DO_CONVIDADO}, companions(id, guest_id, name, position, created_at)`)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Não foi possível listar os convidados: ${error.message}`);
  }

  return (data ?? []).map((linha) => paraDominio(linha as LinhaComAcompanhantes));
}

/**
 * Busca um convidado pelo token da URL publica.
 *
 * Tambem em cache por requisicao: generateMetadata e a propria pagina pedem
 * o mesmo convidado, e sem isso cada visita faria duas consultas iguais.
 */
export const buscarConvidadoPorToken = cache(async function buscarConvidadoPorToken(
  token: string,
): Promise<Convidado | null> {
  const { data, error } = await supabase()
    .from('guests')
    .select(`${COLUNAS_DO_CONVIDADO}, companions(id, guest_id, name, position, created_at)`)
    .eq('token', token)
    .maybeSingle();

  if (error) {
    console.error('[convidados] falha ao buscar pelo token:', error.message);
    return null;
  }

  return data ? paraDominio(data as LinhaComAcompanhantes) : null;
});

/**
 * Cria a linha de quem respondeu pelo link unico.
 *
 * Ninguem e cadastrado antes: a pessoa abre o link, digita o nome e a linha
 * nasce aqui. O token continua existindo, porque e por ele que as funcoes de
 * confirmar e recusar acham a linha, e e ele que fica no cookie para a pessoa
 * poder voltar e mudar a resposta.
 *
 * O indice unico do token e a autoridade final. Na colisao, que e
 * astronomicamente improvavel com 80 bits, basta sortear outro.
 */
export async function criarRespostaAberta(
  nome: string,
  codigoDaVariante: string | null,
): Promise<{ id: string; token: string }> {
  const cliente = supabase();
  const agora = new Date().toISOString();

  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    const { data, error } = await cliente
      .from('guests')
      .insert({
        name: nome,
        token: gerarToken(),
        variant_code: codigoDaVariante,
        // Quem responde abriu o link, entao a abertura ja vale.
        first_opened_at: agora,
        last_opened_at: agora,
        open_count: 1,
      })
      .select('id, token')
      .single();

    if (!error && data) return data;

    // 23505 e violacao de unicidade; qualquer outro erro e real.
    if (error && error.code !== '23505') {
      throw new Error(`Não foi possível registrar a resposta: ${error.message}`);
    }
  }

  throw new Error('Não foi possível gerar um token único para a resposta.');
}

/** Remove o convidado. Os acompanhantes saem junto, por cascata. */
export async function removerConvidado(id: string): Promise<void> {
  const { error } = await supabase().from('guests').delete().eq('id', id);

  if (error) {
    throw new Error(`Não foi possível remover o convidado: ${error.message}`);
  }
}

/** Interpreta a resposta jsonb das funcoes do Postgres. */
function lerRespostaRpc(valor: unknown): RespostaRpc {
  if (typeof valor === 'object' && valor !== null && 'ok' in valor) {
    return valor as RespostaRpc;
  }
  return { ok: false, erro: 'resposta_inesperada' };
}

export type ResultadoDeResposta =
  | { ok: true }
  | { ok: false; erro: 'convidado_nao_encontrado' | 'limite_acompanhantes' | 'falha' };

/**
 * Confirma a presenca. Idempotente e transacional.
 *
 * Chamar de novo so atualiza o nome e a lista de acompanhantes; a data da
 * primeira confirmacao fica preservada.
 */
export async function confirmarPresenca(
  token: string,
  nome: string,
  acompanhantes: readonly string[],
): Promise<ResultadoDeResposta> {
  const { data, error } = await supabase().rpc('confirmar_presenca', {
    p_token: token,
    p_nome: nome,
    p_acompanhantes: [...acompanhantes],
  });

  if (error) {
    console.error('[convidados] falha ao confirmar presença:', error.message);
    return { ok: false, erro: 'falha' };
  }

  const resposta = lerRespostaRpc(data);
  if (resposta.ok) return { ok: true };

  if (resposta.erro === 'convidado_nao_encontrado') {
    return { ok: false, erro: 'convidado_nao_encontrado' };
  }
  if (resposta.erro === 'limite_acompanhantes') {
    return { ok: false, erro: 'limite_acompanhantes' };
  }
  return { ok: false, erro: 'falha' };
}

/** Marca a recusa e limpa os acompanhantes, tambem de forma idempotente. */
export async function recusarConvite(
  token: string,
  nome: string,
): Promise<ResultadoDeResposta> {
  const { data, error } = await supabase().rpc('recusar_convite', {
    p_token: token,
    p_nome: nome,
  });

  if (error) {
    console.error('[convidados] falha ao recusar o convite:', error.message);
    return { ok: false, erro: 'falha' };
  }

  const resposta = lerRespostaRpc(data);
  if (resposta.ok) return { ok: true };
  if (resposta.erro === 'convidado_nao_encontrado') {
    return { ok: false, erro: 'convidado_nao_encontrado' };
  }
  return { ok: false, erro: 'falha' };
}

/**
 * Registra que o convidado abriu o convite.
 *
 * So e chamada pela rota que o navegador aciona depois de montar a pagina.
 * Nenhum caminho de renderizacao no servidor passa por aqui, para a previa do
 * WhatsApp nunca marcar o convite como aberto.
 */
export async function registrarAbertura(token: string): Promise<boolean> {
  const { data, error } = await supabase().rpc('registrar_abertura', {
    p_token: token,
  });

  if (error) {
    console.error('[convidados] falha ao registrar abertura:', error.message);
    return false;
  }

  return lerRespostaRpc(data).ok;
}

/** Confere se o token existe, sem trazer o resto dos dados. */
export async function tokenExiste(token: string): Promise<boolean> {
  const { data, error } = await supabase()
    .from('guests')
    .select('id')
    .eq('token', token)
    .maybeSingle();

  if (error) {
    console.error('[convidados] falha ao verificar o token:', error.message);
    return false;
  }

  return data !== null;
}
