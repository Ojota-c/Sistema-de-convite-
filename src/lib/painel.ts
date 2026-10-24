import { formatarDataHoraCurta } from './datas';

import type {
  Convidado,
  ResumoDoPainel,
  StatusConvidado,
} from '@/types/dominio';
import { ROTULOS_DE_STATUS } from '@/types/dominio';

/**
 * Contas, filtros e exportacao do painel de acompanhamento.
 * Tudo puro, para poder ser testado sem banco.
 */

export interface MarcasDeResposta {
  primeiraAberturaEm: Date | null;
  confirmadoEm: Date | null;
  recusadoEm: Date | null;
}

/**
 * Status visivel de um convidado.
 * A resposta vale mais que a abertura: alguem pode confirmar antes do registro
 * de abertura chegar, e nesse caso o certo a mostrar e "Confirmado".
 */
export function statusDoConvidado(marcas: MarcasDeResposta): StatusConvidado {
  if (marcas.confirmadoEm) return 'confirmado';
  if (marcas.recusadoEm) return 'recusado';
  if (marcas.primeiraAberturaEm) return 'sem-resposta';
  return 'nao-abriu';
}

/** Numeros dos cartoes do topo do painel. */
export function resumir(convidados: readonly Convidado[]): ResumoDoPainel {
  const resumo: ResumoDoPainel = {
    cadastrados: convidados.length,
    abriram: 0,
    naoAbriram: 0,
    confirmados: 0,
    recusaram: 0,
    semResposta: 0,
    pessoasConfirmadas: 0,
  };

  for (const convidado of convidados) {
    if (convidado.primeiraAberturaEm) {
      resumo.abriram += 1;
    } else {
      resumo.naoAbriram += 1;
    }

    switch (convidado.status) {
      case 'confirmado':
        resumo.confirmados += 1;
        // O proprio convidado mais os acompanhantes que ele trouxe.
        resumo.pessoasConfirmadas += 1 + convidado.acompanhantes.length;
        break;
      case 'recusado':
        resumo.recusaram += 1;
        break;
      default:
        resumo.semResposta += 1;
        break;
    }
  }

  return resumo;
}

/** Tira acento e baixa a caixa, para a busca nao depender de digitacao exata. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export interface FiltrosDoPainel {
  status?: StatusConvidado | 'todos';
  busca?: string;
}

/** Aplica filtro de status e busca por nome, inclusive nos acompanhantes. */
export function filtrar(
  convidados: readonly Convidado[],
  filtros: FiltrosDoPainel,
): Convidado[] {
  const status = filtros.status ?? 'todos';
  const termo = normalizarBusca(filtros.busca ?? '');

  return convidados.filter((convidado) => {
    if (status !== 'todos' && convidado.status !== status) return false;
    if (termo.length === 0) return true;

    if (normalizarBusca(convidado.nome).includes(termo)) return true;
    return convidado.acompanhantes.some((acompanhante) =>
      normalizarBusca(acompanhante.nome).includes(termo),
    );
  });
}

// ---------------------------------------------------------------------------
// Exportacao em CSV
// ---------------------------------------------------------------------------

const COLUNAS = [
  'Nome',
  'Telefone',
  'Status',
  'Acompanhantes',
  'Total de pessoas',
  'Primeira abertura',
  'Ultima abertura',
  'Aberturas',
  'Respondeu em',
  'Link do convite',
] as const;

/**
 * Escapa um campo de CSV.
 *
 * Alem das aspas e da virgula, neutraliza as formulas: uma celula que comeca
 * com =, +, - ou @ vira formula ao abrir no Excel, e um nome de convidado nao
 * pode virar codigo executavel na planilha de quem recebe o arquivo.
 */
export function escaparCampoCsv(valor: string): string {
  const neutralizado = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;

  if (/["\n\r,;]/.test(neutralizado) || neutralizado !== neutralizado.trim()) {
    return `"${neutralizado.replace(/"/g, '""')}"`;
  }
  return neutralizado;
}

export interface OpcoesDeCsv {
  fuso?: string;
  urlBase?: string;
}

/**
 * Monta o CSV completo da lista.
 * Comeca com BOM para o Excel reconhecer o UTF-8 e nao estragar os acentos,
 * e usa CRLF, que e o que a especificacao do formato pede.
 */
export function gerarCsv(
  convidados: readonly Convidado[],
  opcoes: OpcoesDeCsv = {},
): string {
  const { fuso, urlBase } = opcoes;

  const linhas: string[] = [COLUNAS.map(escaparCampoCsv).join(',')];

  for (const convidado of convidados) {
    const respondeuEm = convidado.confirmadoEm ?? convidado.recusadoEm;

    const campos = [
      convidado.nome,
      convidado.telefone ?? '',
      ROTULOS_DE_STATUS[convidado.status],
      convidado.acompanhantes.map((a) => a.nome).join('; '),
      convidado.status === 'confirmado'
        ? String(1 + convidado.acompanhantes.length)
        : '0',
      convidado.primeiraAberturaEm
        ? formatarDataHoraCurta(convidado.primeiraAberturaEm, fuso)
        : '',
      convidado.ultimaAberturaEm
        ? formatarDataHoraCurta(convidado.ultimaAberturaEm, fuso)
        : '',
      String(convidado.totalDeAberturas),
      respondeuEm ? formatarDataHoraCurta(respondeuEm, fuso) : '',
      urlBase ? `${urlBase.replace(/\/+$/, '')}/c/${convidado.token}` : convidado.token,
    ];

    linhas.push(campos.map(escaparCampoCsv).join(','));
  }

  return `\uFEFF${linhas.join('\r\n')}\r\n`;
}

/** Nome do arquivo de exportacao, com a data de hoje. */
export function nomeDoArquivoCsv(agora: Date = new Date()): string {
  const dois = (n: number) => String(n).padStart(2, '0');
  const data = `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
  return `convidados-${data}.csv`;
}
