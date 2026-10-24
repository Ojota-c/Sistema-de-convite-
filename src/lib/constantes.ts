/**
 * Constantes compartilhadas entre o servidor, o proxy e o navegador.
 *
 * Este arquivo nao importa 'server-only' de proposito: o proxy.ts precisa do
 * nome do cookie e nao pode arrastar junto o cliente do Supabase.
 */

/** Cookie da sessao do organizador. */
export const NOME_DO_COOKIE_DE_SESSAO = 'convite_sessao';

/** Caminho do painel. */
export const ROTA_DO_PAINEL = '/admin';

/** Caminho do login do organizador. */
export const ROTA_DE_LOGIN = '/admin/entrar';

/** Limite padrao de acompanhantes, usado antes de o evento ser configurado. */
export const MAX_ACOMPANHANTES_PADRAO = 3;
