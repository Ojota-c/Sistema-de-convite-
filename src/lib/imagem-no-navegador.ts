import { montarPaleta, quantizarPixels, type Paleta } from './paleta';
import { TAMANHO_MAXIMO_IMAGEM, TIPOS_DE_IMAGEM } from './validacao';

/**
 * Preparo da imagem do convite, feito no navegador antes do envio.
 *
 * Duas coisas acontecem aqui, e as duas precisam do canvas:
 *
 *   1. Redimensionar e comprimir. A foto que sai do celular costuma ter mais
 *      de 4 MB e 4000 pixels de largura. Reduzir antes de subir economiza o
 *      armazenamento do plano gratuito e deixa o convite abrir rapido no 4G.
 *
 *   2. Extrair a paleta. Ler os pixels aqui evita ter de processar imagem no
 *      servidor, o que exigiria uma dependencia nativa pesada.
 *
 * A quantizacao e o calculo das cores ficam em paleta.ts, que e puro e
 * testado. Este arquivo so cuida da parte que fala com o navegador.
 */

/** Maior lado da imagem depois do redimensionamento. */
const LADO_MAXIMO = 1600;

/** Lado do quadrado usado para amostrar as cores. */
const LADO_DA_AMOSTRA = 72;

const QUALIDADE_INICIAL = 0.86;
const QUALIDADE_MINIMA = 0.55;

/**
 * A arte sai sempre em JPEG, mesmo o WebP comprimindo bem melhor.
 *
 * O motivo e a previa do link no WhatsApp. O WebP so e lido por versoes
 * recentes do aplicativo, e o convite vai para familia inteira, com celular
 * de todo tipo. Em JPEG a previa aparece em qualquer versao.
 */
const TIPO_DE_SAIDA = 'image/jpeg';

/**
 * Teto de tamanho da arte.
 *
 * Previa do WhatsApp costuma falhar acima de 300 KB, principalmente para quem
 * esta no 4G. Deixamos uma folga confortavel abaixo disso.
 */
const TAMANHO_ALVO = 260 * 1024;

export interface ImagemProcessada {
  blob: Blob;
  tipo: string;
  largura: number;
  altura: number;
  paleta: Paleta;
  /** URL temporaria para a previa. Lembre de revogar quando nao precisar mais. */
  previa: string;
  tamanhoOriginal: number;
  tamanhoFinal: number;
}

export class ErroDeImagem extends Error {}

function criarCanvas(largura: number, altura: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  return canvas;
}

function paraBlob(
  canvas: HTMLCanvasElement,
  tipo: string,
  qualidade: number,
): Promise<Blob | null> {
  return new Promise((resolver) => {
    canvas.toBlob((blob) => resolver(blob), tipo, qualidade);
  });
}

export async function processarImagem(arquivo: File): Promise<ImagemProcessada> {
  if (!TIPOS_DE_IMAGEM.includes(arquivo.type as (typeof TIPOS_DE_IMAGEM)[number])) {
    throw new ErroDeImagem('Formato não aceito. Envie um JPG, PNG ou WebP.');
  }

  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {
    throw new ErroDeImagem('A imagem passa de 5 MB. Escolha uma menor.');
  }

  // imageOrientation respeita o EXIF, senao a foto tirada de lado sobe deitada.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
  } catch {
    throw new ErroDeImagem('Não conseguimos abrir essa imagem. Tente outro arquivo.');
  }

  try {
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const largura = Math.max(1, Math.round(bitmap.width * escala));
    const altura = Math.max(1, Math.round(bitmap.height * escala));

    const canvas = criarCanvas(largura, altura);
    const contexto = canvas.getContext('2d');
    if (!contexto) {
      throw new ErroDeImagem('Seu navegador não conseguiu processar a imagem.');
    }

    contexto.imageSmoothingQuality = 'high';
    contexto.drawImage(bitmap, 0, 0, largura, altura);

    // ----- paleta -----
    // Uma copia minuscula basta: a cor dominante nao muda com a resolucao, e
    // ler poucos milhares de pixels e instantaneo mesmo em celular antigo.
    const proporcao = Math.min(LADO_DA_AMOSTRA / largura, LADO_DA_AMOSTRA / altura, 1);
    const larguraDaAmostra = Math.max(1, Math.round(largura * proporcao));
    const alturaDaAmostra = Math.max(1, Math.round(altura * proporcao));

    const canvasDaAmostra = criarCanvas(larguraDaAmostra, alturaDaAmostra);
    const contextoDaAmostra = canvasDaAmostra.getContext('2d', {
      willReadFrequently: true,
    });

    let paleta = montarPaleta([]);
    if (contextoDaAmostra) {
      contextoDaAmostra.drawImage(bitmap, 0, 0, larguraDaAmostra, alturaDaAmostra);
      const dados = contextoDaAmostra.getImageData(
        0,
        0,
        larguraDaAmostra,
        alturaDaAmostra,
      );
      paleta = montarPaleta(quantizarPixels(dados.data));
    }

    // ----- compressao -----
    const tipo = TIPO_DE_SAIDA;

    let qualidade = QUALIDADE_INICIAL;
    let blob = await paraBlob(canvas, tipo, qualidade);

    // Desce a qualidade por passos ate caber no alvo. O limite que importa
    // aqui e o do WhatsApp, bem menor que os 5 MB aceitos pelo servidor.
    while (blob && blob.size > TAMANHO_ALVO && qualidade > QUALIDADE_MINIMA) {
      qualidade -= 0.06;
      blob = await paraBlob(canvas, tipo, qualidade);
    }

    if (!blob) {
      throw new ErroDeImagem('Não conseguimos comprimir a imagem. Tente outra.');
    }

    if (blob.size > TAMANHO_MAXIMO_IMAGEM) {
      throw new ErroDeImagem(
        'Mesmo comprimida a imagem ficou grande demais. Escolha outra.',
      );
    }

    return {
      blob,
      tipo,
      largura,
      altura,
      paleta,
      previa: URL.createObjectURL(blob),
      tamanhoOriginal: arquivo.size,
      tamanhoFinal: blob.size,
    };
  } finally {
    bitmap.close();
  }
}

/** Tamanho legivel, para mostrar quanto a compressao economizou. */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
