import type { Paleta } from './paleta';
import type { Evento, Variante } from '@/types/dominio';

/**
 * Qual arte cada convidado enxerga.
 *
 * O evento pode ter varias artes, iguais em tudo menos num detalhe. No Chá da
 * Flora sao tres, que mudam so o tamanho da fralda sugerida.
 *
 * A regra de escolha fica aqui, pura e testavel, porque ela e usada em tres
 * lugares que precisam concordar entre si: a pagina do convidado, a rota que
 * serve a imagem e os metadados da previa do WhatsApp. Se os tres
 * discordassem, a previa mostraria um tamanho e a pagina outro.
 */

export interface ArteDoConvite {
  /** Caminho do arquivo no Storage, ou null quando nao ha imagem nenhuma. */
  caminho: string | null;
  tipo: string | null;
  largura: number | null;
  altura: number | null;
  paleta: Paleta;
  /** Texto do detalhe que muda, por exemplo "Fraldas tamanho M". */
  descricao: string | null;
  /** Codigo da variante usada, ou null quando caiu na arte geral do evento. */
  codigo: string | null;
}

/**
 * Escolhe a arte, nesta ordem:
 *
 *   1. a variante do convidado, se ela existir e tiver imagem;
 *   2. a imagem geral do evento, como rede de seguranca.
 *
 * O passo 2 importa: enquanto o organizador nao terminar de enviar as tres
 * artes, ou enquanto nao tiver distribuido os tamanhos, nenhum convite pode
 * aparecer quebrado para quem ja recebeu o link.
 */
export function resolverArte(
  evento: Evento,
  variante: Variante | null | undefined,
): ArteDoConvite {
  if (variante?.temImagem) {
    return {
      caminho: variante.caminhoDaImagem,
      tipo: variante.tipoDaImagem,
      largura: variante.larguraDaImagem,
      altura: variante.alturaDaImagem,
      paleta: variante.paleta ?? evento.paleta,
      descricao: variante.descricao,
      codigo: variante.codigo,
    };
  }

  return {
    caminho: evento.caminhoDaImagem,
    tipo: evento.tipoDaImagem,
    largura: evento.larguraDaImagem,
    altura: evento.alturaDaImagem,
    paleta: evento.paleta,
    // A descricao da variante continua valendo mesmo sem arte propria: o
    // convidado precisa saber o tamanho da fralda ainda que a imagem seja a
    // generica, e quem usa leitor de tela so tem esse texto.
    descricao: variante?.descricao ?? null,
    codigo: variante?.codigo ?? null,
  };
}

/** Acha a variante de um codigo dentro da lista, sem diferenciar maiuscula. */
export function acharVariante(
  variantes: readonly Variante[],
  codigo: string | null | undefined,
): Variante | null {
  if (!codigo) return null;
  const alvo = codigo.trim().toUpperCase();
  return variantes.find((v) => v.codigo.toUpperCase() === alvo) ?? null;
}

/** Quantas variantes ainda estao sem arte enviada. */
export function variantesSemArte(variantes: readonly Variante[]): Variante[] {
  return variantes.filter((v) => !v.temImagem);
}

/** Distribui os convidados por variante, para o resumo do painel. */
export function contarPorVariante(
  convidados: readonly { variante: string | null }[],
  variantes: readonly Variante[],
): { codigo: string; descricao: string; total: number }[] {
  const contagem = new Map<string, number>();
  let semDefinir = 0;

  for (const convidado of convidados) {
    const achada = acharVariante(variantes, convidado.variante);
    if (achada) {
      contagem.set(achada.codigo, (contagem.get(achada.codigo) ?? 0) + 1);
    } else {
      semDefinir += 1;
    }
  }

  const linhas = variantes
    .slice()
    .sort((a, b) => a.posicao - b.posicao)
    .map((v) => ({
      codigo: v.codigo,
      descricao: v.descricao,
      total: contagem.get(v.codigo) ?? 0,
    }));

  if (semDefinir > 0) {
    linhas.push({ codigo: '', descricao: 'Sem tamanho definido', total: semDefinir });
  }

  return linhas;
}
