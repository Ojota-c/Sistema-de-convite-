import 'server-only';

import { cookies } from 'next/headers';

import { normalizarToken } from '@/lib/token';

/**
 * Lembra, no celular de quem respondeu, qual foi a resposta.
 *
 * O link e o mesmo para todo mundo, entao a URL nao diz quem e a pessoa. O
 * cookie guarda o token da linha criada na primeira resposta: quando ela volta
 * ao link, ve o que respondeu e pode mudar, em vez de criar uma resposta
 * repetida.
 *
 * httpOnly, porque o token so serve ao servidor. Nao e uma barreira de
 * seguranca: quem nao tem o cookie simplesmente responde como pessoa nova.
 */

const NOME_DO_COOKIE = 'convite_resposta';

/** Seis meses: passa com folga da data da festa. */
const DURACAO_EM_SEGUNDOS = 60 * 60 * 24 * 180;

export async function lerTokenDaResposta(): Promise<string | null> {
  const jar = await cookies();
  return normalizarToken(jar.get(NOME_DO_COOKIE)?.value);
}

/** So pode ser chamada de uma Server Action ou Route Handler. */
export async function gravarTokenDaResposta(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(NOME_DO_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DURACAO_EM_SEGUNDOS,
  });
}
