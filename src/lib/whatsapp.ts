/**
 * Montagem da mensagem e dos links de compartilhamento.
 *
 * O organizador escreve um modelo com marcadores entre chaves. A substituicao
 * usa replaceAll em texto puro, sem expressao regular, para que um nome com
 * parentese ou cifrao nao quebre nada.
 */

export const MARCADORES = ['{nome}', '{evento}', '{data}', '{local}', '{link}'] as const;

export const MENSAGEM_PADRAO = [
  'Oi, {nome}! Tem uma festinha chegando e você faz falta nela.',
  '',
  '{evento}',
  '{data}',
  '{local}',
  '',
  'Abre o convite e confirma sua presença por aqui:',
  '{link}',
].join('\n');

export interface DadosDoModelo {
  nome: string;
  evento: string;
  data: string;
  local: string;
  link: string;
}

/**
 * Troca os marcadores pelo conteudo e limpa as linhas que ficaram vazias.
 *
 * Usa uma funcao substituidora, nao uma string: numa string de substituicao o
 * JavaScript ainda interpreta $&, $` e $', entao um convidado chamado
 * "Ana $& Silva" corromperia a mensagem. O retorno de uma funcao entra literal.
 *
 * E uma passagem so, de modo que um valor que por acaso contenha "{link}" nao
 * seja expandido de novo.
 */
export function aplicarModelo(modelo: string, dados: DadosDoModelo): string {
  const valores: Record<string, string> = {
    '{nome}': dados.nome,
    '{evento}': dados.evento,
    '{data}': dados.data,
    '{local}': dados.local,
    '{link}': dados.link,
  };

  const texto = modelo.replace(
    /\{(?:nome|evento|data|local|link)\}/g,
    (marcador) => valores[marcador] ?? marcador,
  );

  // Um marcador sem valor nao pode deixar uma linha solta no meio do texto.
  return texto
    .split('\n')
    .map((linha) => linha.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** URL publica e personalizada de um convidado. */
export function linkDoConvite(urlBase: string, token: string): string {
  const base = urlBase.trim().replace(/\/+$/, '');
  return `${base}/c/${token}`;
}

/**
 * Link do WhatsApp com o texto pronto.
 * Com telefone, abre direto na conversa da pessoa; sem telefone, abre o
 * seletor de contato do proprio WhatsApp.
 */
export function linkWhatsApp(telefone: string | null | undefined, texto: string): string {
  const digitos = (telefone ?? '').replace(/\D/g, '');
  const mensagem = encodeURIComponent(texto);
  return digitos.length >= 8
    ? `https://wa.me/${digitos}?text=${mensagem}`
    : `https://wa.me/?text=${mensagem}`;
}

/** Telefone formatado para leitura, quando parece um numero brasileiro. */
export function formatarTelefone(telefone: string | null | undefined): string | null {
  const digitos = (telefone ?? '').replace(/\D/g, '');
  if (digitos.length === 0) return null;

  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    const ddd = digitos.slice(2, 4);
    const resto = digitos.slice(4);
    const meio = resto.length === 9 ? resto.slice(0, 5) : resto.slice(0, 4);
    const fim = resto.length === 9 ? resto.slice(5) : resto.slice(4);
    return `(${ddd}) ${meio}-${fim}`;
  }

  return `+${digitos}`;
}
