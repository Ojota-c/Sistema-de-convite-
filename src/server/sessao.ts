import 'server-only';

import { createHmac, randomBytes } from 'node:crypto';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { NOME_DO_COOKIE_DE_SESSAO } from '@/lib/constantes';
import { compararSegredos } from '@/lib/token';

import { ambiente } from './ambiente';

/**
 * Sessao do organizador.
 *
 * Nao ha cadastro de contas: ou a pessoa sabe a ADMIN_PASSWORD, ou nao entra.
 * O cookie guarda uma carga minima assinada com HMAC SHA-256, entao ninguem
 * consegue forjar uma sessao sem o ADMIN_SESSION_SECRET.
 *
 * A verificacao mora aqui e e chamada por toda pagina e toda action do painel.
 * O proxy.ts cuida so do redirecionamento; ele nunca e a unica barreira.
 */

/** Reexportado do modulo de constantes, que o proxy.ts tambem usa. */
export const NOME_DO_COOKIE = NOME_DO_COOKIE_DE_SESSAO;

/** Doze horas. Curto o bastante para um notebook esquecido aberto. */
const DURACAO_EM_SEGUNDOS = 60 * 60 * 12;

interface CargaDaSessao {
  /** Instante de expiracao, em segundos desde a época. */
  exp: number;
  /** Valor aleatorio, para dois logins nunca gerarem o mesmo cookie. */
  jti: string;
}

function assinar(cargaCodificada: string): string {
  return createHmac('sha256', ambiente().ADMIN_SESSION_SECRET)
    .update(cargaCodificada)
    .digest('base64url');
}

/** Monta o valor do cookie: carga em base64url, ponto, assinatura. */
export function criarValorDeSessao(agoraEmMs: number = Date.now()): string {
  const carga: CargaDaSessao = {
    exp: Math.floor(agoraEmMs / 1000) + DURACAO_EM_SEGUNDOS,
    jti: randomBytes(12).toString('base64url'),
  };

  const codificada = Buffer.from(JSON.stringify(carga), 'utf8').toString('base64url');
  return `${codificada}.${assinar(codificada)}`;
}

/** Confere assinatura e validade. Qualquer defeito significa sessao invalida. */
export function valorDeSessaoEhValido(
  valor: string | undefined | null,
  agoraEmMs: number = Date.now(),
): boolean {
  if (!valor) return false;

  const separador = valor.lastIndexOf('.');
  if (separador <= 0 || separador === valor.length - 1) return false;

  const codificada = valor.slice(0, separador);
  const assinatura = valor.slice(separador + 1);

  // Compara em tempo constante, antes de olhar o conteudo.
  if (!compararSegredos(assinatura, assinar(codificada))) return false;

  try {
    const bruta: unknown = JSON.parse(
      Buffer.from(codificada, 'base64url').toString('utf8'),
    );
    if (typeof bruta !== 'object' || bruta === null) return false;

    const expiracao = (bruta as { exp?: unknown }).exp;
    if (typeof expiracao !== 'number' || !Number.isFinite(expiracao)) return false;

    return expiracao * 1000 > agoraEmMs;
  } catch {
    return false;
  }
}

/** Opcoes do cookie. Em producao exige HTTPS. */
export function opcoesDoCookie() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: DURACAO_EM_SEGUNDOS,
  };
}

/** Abre a sessao. So pode ser chamada de uma Server Action ou Route Handler. */
export async function abrirSessao(): Promise<void> {
  const jar = await cookies();
  jar.set(NOME_DO_COOKIE, criarValorDeSessao(), opcoesDoCookie());
}

/** Encerra a sessao. */
export async function encerrarSessao(): Promise<void> {
  const jar = await cookies();
  jar.set(NOME_DO_COOKIE, '', { ...opcoesDoCookie(), maxAge: 0 });
}

/** Responde se quem esta pedindo ja passou pelo login. */
export async function sessaoAtiva(): Promise<boolean> {
  const jar = await cookies();
  return valorDeSessaoEhValido(jar.get(NOME_DO_COOKIE)?.value);
}

/**
 * Barreira usada no topo de toda pagina e de toda action do painel.
 * Sem sessao valida, manda para o login e interrompe a execucao.
 */
export async function exigirAdmin(): Promise<void> {
  if (!(await sessaoAtiva())) {
    redirect('/admin/entrar');
  }
}

/**
 * Versao para Server Actions que respondem um estado de formulario.
 * Devolve false em vez de redirecionar, para a action poder avisar na tela.
 */
export async function temSessao(): Promise<boolean> {
  return sessaoAtiva();
}

/** Confere a senha digitada contra a ADMIN_PASSWORD, em tempo constante. */
export function senhaConfere(senhaDigitada: string): boolean {
  return compararSegredos(senhaDigitada, ambiente().ADMIN_PASSWORD);
}
