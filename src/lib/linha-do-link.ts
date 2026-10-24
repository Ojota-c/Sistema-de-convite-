/**
 * Onde escrever o link dentro da arte do convite.
 *
 * Artes de convite quase sempre trazem um campo em branco com um texto do
 * tipo "clique aqui para confirmar", e um filete embaixo esperando o
 * endereco. Esse filete e desenhado, nao e um campo de verdade: num JPEG nao
 * existe link clicavel.
 *
 * A posicao e guardada, nao adivinhada. Tentei detectar o filete varrendo os
 * pixels e nao da: a arte do Chá da Flora tem tres tracados largos na metade
 * de baixo, a borda da caixa do "clique aqui", o filete de dentro dela e a
 * borda da caixa do churrasco. Visualmente sao iguais; o que distingue o
 * certo e o significado, nao a aparencia. Ficar com o mais comprido escreve
 * em cima da borda da caixa, e ficar com o mais baixo escreve dentro do
 * churrasco. Uma volta de configuracao resolve de vez, e vale para qualquer
 * arte futura.
 *
 * Este arquivo e puro: numeros entram, numeros saem, sem tocar em canvas.
 */

export interface LinhaDoLink {
  /** Posicao vertical do filete, em fracao da altura. */
  y: number;
  /** Onde o trecho util comeca, em fracao da largura. */
  inicio: number;
  /** Onde termina, em fracao da largura. */
  fim: number;
}

/**
 * Medido na arte do Chá da Flora, de 1058 por 1600: o filete fica a 83,5% da
 * altura e vai de 25,3% a 81,8% da largura. Serve de ponto de partida para
 * qualquer convite com a mesma estrutura.
 */
export const LINHA_PADRAO: LinhaDoLink = { y: 0.835, inicio: 0.253, fim: 0.818 };

/** Limites que mantem o texto dentro da arte e com espaco util. */
const LARGURA_MINIMA = 0.1;

function dentroDaFaixa(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 1;
}

/**
 * Le a posicao gravada no banco.
 * Qualquer valor faltando ou incoerente cai no padrao: uma configuracao
 * estragada nao pode impedir o organizador de baixar o convite.
 */
export function lerLinhaDoLink(valor: unknown): LinhaDoLink {
  if (typeof valor !== 'object' || valor === null) return LINHA_PADRAO;

  const bruto = valor as Record<string, unknown>;
  const { y, inicio, fim } = bruto;

  if (!dentroDaFaixa(y) || !dentroDaFaixa(inicio) || !dentroDaFaixa(fim)) {
    return LINHA_PADRAO;
  }
  if (fim - inicio < LARGURA_MINIMA) return LINHA_PADRAO;

  return { y, inicio, fim };
}

/** Converte a posicao em pixels de uma arte do tamanho informado. */
export function emPixels(
  linha: LinhaDoLink,
  largura: number,
  altura: number,
): { y: number; x1: number; x2: number; centro: number; disponivel: number } {
  const x1 = linha.inicio * largura;
  const x2 = linha.fim * largura;
  return {
    y: linha.y * altura,
    x1,
    x2,
    centro: (x1 + x2) / 2,
    // Uma folga de 4%, para o texto nao encostar nas pontas do filete.
    disponivel: (x2 - x1) * 0.96,
  };
}

/**
 * Tamanho de fonte que faz o texto caber na linha.
 *
 * Trabalha com a largura que o texto ocupa a um em, medida por quem chamou
 * no proprio canvas, de modo que a conta aqui nao dependa de nenhuma API de
 * navegador.
 */
export function tamanhoDaFonte(
  larguraDisponivel: number,
  larguraDoTextoEmUmEm: number,
  limite = { minimo: 10, maximo: 44 },
): number {
  if (larguraDoTextoEmUmEm <= 0) return limite.minimo;
  const ideal = larguraDisponivel / larguraDoTextoEmUmEm;
  return Math.max(limite.minimo, Math.min(limite.maximo, Math.floor(ideal)));
}

/** Tira o esquema da URL, que so ocupa espaco na linha. */
export function encurtarParaExibicao(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

/** Converte fracao em porcentagem inteira, para os campos do painel. */
export function paraPorcentagem(fracao: number): number {
  return Math.round(fracao * 1000) / 10;
}

/** Caminho inverso, da porcentagem digitada para a fracao guardada. */
export function dePorcentagem(porcentagem: number): number {
  return Math.min(1, Math.max(0, porcentagem / 100));
}
