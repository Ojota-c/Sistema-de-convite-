import 'server-only';

import { headers } from 'next/headers';

import { supabase } from './supabase';

/**
 * Rate limit por janela deslizante, guardado no proprio Postgres.
 *
 * Contador em memoria nao serve: cada requisicao na Vercel pode cair em uma
 * instancia diferente, e a memoria some entre uma e outra. A funcao
 * rl_consumir faz o incremento de forma atomica, entao o limite vale para
 * todas as instancias ao mesmo tempo.
 */

export interface Limite {
  /** Quantas requisicoes a janela aceita. */
  maximo: number;
  /** Tamanho da janela, em segundos. */
  janelaSegundos: number;
}

/** Confirmar presenca: generoso, so barra automacao. */
export const LIMITE_CONFIRMACAO: Limite = { maximo: 20, janelaSegundos: 300 };
/** Registro de abertura: o convidado pode recarregar a pagina a vontade. */
export const LIMITE_ABERTURA: Limite = { maximo: 60, janelaSegundos: 300 };
/** Login do organizador: apertado, porque protege uma senha. */
export const LIMITE_LOGIN: Limite = { maximo: 8, janelaSegundos: 600 };

/**
 * Endereco de quem fez a requisicao.
 * Atras do proxy da Vercel, o primeiro item de x-forwarded-for e o cliente.
 */
export async function enderecoDoCliente(): Promise<string> {
  const cabecalhos = await headers();

  const encaminhado = cabecalhos.get('x-forwarded-for');
  if (encaminhado) {
    const primeiro = encaminhado.split(',')[0]?.trim();
    if (primeiro) return primeiro;
  }

  return cabecalhos.get('x-real-ip')?.trim() ?? 'desconhecido';
}

/**
 * Consome uma unidade do limite e diz se a requisicao pode seguir.
 *
 * Se o proprio banco falhar, libera a passagem e registra o problema: uma
 * instabilidade no Postgres nao pode impedir um convidado de confirmar
 * presenca. As rotas protegidas continuam exigindo senha ou token validos.
 */
export async function dentroDoLimite(chave: string, limite: Limite): Promise<boolean> {
  try {
    const { data, error } = await supabase().rpc('rl_consumir', {
      p_bucket: chave.slice(0, 200),
      p_limite: limite.maximo,
      p_janela_segundos: limite.janelaSegundos,
    });

    if (error) {
      console.error('[limite] falha ao consultar o rate limit:', error.message);
      return true;
    }

    return data !== false;
  } catch (erro) {
    console.error('[limite] erro inesperado no rate limit:', erro);
    return true;
  }
}

/** Monta a chave do balde combinando a acao com quem a disparou. */
export function chaveDeLimite(acao: string, identificador: string): string {
  return `${acao}:${identificador}`;
}
