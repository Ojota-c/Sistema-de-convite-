import {
  LINHA_PADRAO,
  emPixels,
  encurtarParaExibicao,
  tamanhoDaFonte,
  type LinhaDoLink,
} from './linha-do-link';

/**
 * Monta, no navegador, uma copia da arte do convite com o endereco do
 * convidado escrito no campo em branco.
 *
 * Serve para o organizador que prefere mandar a foto do convite junto com a
 * mensagem, em vez de contar so com a previa do link. O endereco escrito na
 * imagem NAO e clicavel, porque um JPEG nao guarda link; ele vale como
 * referência visual e para quem for imprimir o convite. O caminho clicavel
 * continua sendo o link da mensagem.
 *
 * Tudo acontece no navegador: nenhuma imagem e gerada ou guardada no
 * servidor, entao isto nao consome nada da cota do plano gratuito.
 */

const FAMILIA_DA_FONTE =
  "'Alegreya Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif";

export class ErroAoMontarConvite extends Error {}

function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rejeitar) => {
    const imagem = new Image();
    // Mesma origem, entao o canvas nao fica marcado e o toBlob funciona.
    imagem.crossOrigin = 'anonymous';
    imagem.onload = () => resolver(imagem);
    imagem.onerror = () =>
      rejeitar(new ErroAoMontarConvite('Não conseguimos carregar a arte do convite.'));
    imagem.src = url;
  });
}

/**
 * Le a cor da tinta usada na propria linha, para o texto escrito combinar
 * com o convite em vez de ser preto por cima de uma arte delicada.
 */
function corDaLinha(
  contexto: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
): string {
  try {
    const amostra = contexto.getImageData(Math.round(x), Math.round(y), Math.max(1, Math.round(largura)), 1);
    let r = 0;
    let g = 0;
    let b = 0;
    let total = 0;

    for (let i = 0; i + 3 < amostra.data.length; i += 4) {
      const vermelho = amostra.data[i] ?? 0;
      const verde = amostra.data[i + 1] ?? 0;
      const azul = amostra.data[i + 2] ?? 0;
      const maior = Math.max(vermelho, verde, azul);
      const menor = Math.min(vermelho, verde, azul);
      // So conta pixel com tinta, ignorando o papel ao redor.
      if (maior - menor > 18 || maior < 140) {
        r += vermelho;
        g += verde;
        b += azul;
        total += 1;
      }
    }

    if (total === 0) return '#8a5a3c';

    // Escurece um pouco, para o texto ficar mais legivel que o filete.
    const escurecer = (v: number) => Math.round((v / total) * 0.78);
    return `rgb(${escurecer(r)}, ${escurecer(g)}, ${escurecer(b)})`;
  } catch {
    return '#8a5a3c';
  }
}

export interface ConviteMontado {
  blob: Blob;
  largura: number;
  altura: number;
}

/**
 * Desenha o link na arte e devolve a imagem pronta.
 *
 * @param urlDaArte  rota que serve a arte do convidado, na mesma origem
 * @param link       endereco pessoal dele
 */
export async function montarConviteComLink(
  urlDaArte: string,
  link: string,
  linhaDoLink: LinhaDoLink = LINHA_PADRAO,
): Promise<ConviteMontado> {
  const imagem = await carregarImagem(urlDaArte);

  const largura = imagem.naturalWidth;
  const altura = imagem.naturalHeight;
  if (largura < 1 || altura < 1) {
    throw new ErroAoMontarConvite('A arte do convite veio vazia.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext('2d', { willReadFrequently: true });
  if (!contexto) {
    throw new ErroAoMontarConvite('Seu navegador não conseguiu desenhar a imagem.');
  }

  contexto.drawImage(imagem, 0, 0);

  const { y: yDaLinha, x1, x2, centro, disponivel } = emPixels(
    linhaDoLink,
    largura,
    altura,
  );

  const texto = encurtarParaExibicao(link);

  // Mede o texto a uma unidade conhecida e deduz o corpo que cabe na linha.
  contexto.font = `500 100px ${FAMILIA_DA_FONTE}`;
  const larguraEmCemPx = contexto.measureText(texto).width;
  const corpo = tamanhoDaFonte(disponivel, larguraEmCemPx / 100, {
    minimo: Math.max(10, Math.round(altura * 0.012)),
    maximo: Math.round(altura * 0.028),
  });

  contexto.font = `500 ${corpo}px ${FAMILIA_DA_FONTE}`;
  contexto.fillStyle = corDaLinha(contexto, x1, yDaLinha, x2 - x1);
  contexto.textAlign = 'center';
  contexto.textBaseline = 'alphabetic';

  // Assenta o texto logo acima do filete, com uma folga proporcional.
  contexto.fillText(texto, centro, yDaLinha - corpo * 0.28, disponivel);

  const blob = await new Promise<Blob | null>((resolver) => {
    canvas.toBlob((resultado) => resolver(resultado), 'image/jpeg', 0.9);
  });

  if (!blob) {
    throw new ErroAoMontarConvite('Não conseguimos gerar a imagem final.');
  }

  return { blob, largura, altura };
}

/** Nome de arquivo seguro a partir do nome do convidado. */
export function nomeDoArquivoDoConvite(nome: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `convite-${base.length > 0 ? base : 'convidado'}.jpg`;
}

/** Dispara o download de um blob com o nome informado. */
export function baixarBlob(blob: Blob, nomeDoArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement('a');
  ancora.href = url;
  ancora.download = nomeDoArquivo;
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  // Um instante para o navegador iniciar o download antes de soltar a URL.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
