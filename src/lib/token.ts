import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Alfabeto Crockford base32 em minusculas: os dez digitos mais as letras,
 * sem i, l, o e u. Quem precisar digitar o link a mao nao confunde 1 com l
 * nem 0 com O.
 *
 * Sao exatamente 32 simbolos, entao `byte & 31` reparte os 256 valores
 * possiveis de um byte em 8 faixas iguais de 32. O sorteio nao tem vies.
 */
const SIMBOLOS = '0123456789abcdefghjkmnpqrstvwxyz';

const TAMANHO_PADRAO = 16;
const TAMANHO_MINIMO = 10;

/** Formato aceito pelo banco (veja a constraint guests_token_formato). */
const FORMATO_TOKEN = /^[0-9a-z]{10,64}$/;

/**
 * Gera o token da URL publica do convidado. Aleatorio, nao sequencial e sem
 * relacao nenhuma com a ordem de cadastro. Sempre via crypto, nunca Math.random.
 *
 * No tamanho padrao sao 16 simbolos de 5 bits, ou seja 80 bits de entropia.
 */
export function gerarToken(tamanho: number = TAMANHO_PADRAO): string {
  if (!Number.isInteger(tamanho) || tamanho < TAMANHO_MINIMO) {
    throw new Error(`O token precisa ter ao menos ${TAMANHO_MINIMO} caracteres.`);
  }
  if (tamanho > 64) {
    throw new Error('O token nao pode passar de 64 caracteres.');
  }

  const bytes = randomBytes(tamanho);
  let token = '';
  for (let i = 0; i < tamanho; i += 1) {
    const byte = bytes[i] ?? 0;
    token += SIMBOLOS[byte & 31] ?? '0';
  }
  return token;
}

/**
 * Normaliza e valida um token vindo da URL.
 * Devolve null quando o formato nao bate, para a rota responder 404 sem
 * sequer tocar no banco.
 */
export function normalizarToken(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpo = valor.trim().toLowerCase();
  return FORMATO_TOKEN.test(limpo) ? limpo : null;
}

/**
 * Compara dois segredos em tempo constante.
 *
 * Compara os digests SHA-256, nao as strings cruas: assim os dois lados tem
 * sempre 32 bytes e a duracao da comparacao nao denuncia o tamanho da senha
 * certa. Usada no login do organizador.
 */
export function compararSegredos(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a, 'utf8').digest();
  const digestB = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(digestA, digestB);
}

/** Exportado apenas para os testes conferirem o alfabeto. */
export const SIMBOLOS_DO_TOKEN = SIMBOLOS;
