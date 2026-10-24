import type { Paleta } from '@/lib/paleta';

/**
 * Vocabulario do dominio, em portugues, independente do formato do banco.
 * Todas as datas chegam aqui ja como Date.
 */

export interface Evento {
  titulo: string;
  inicio: Date | null;
  fim: Date | null;
  localNome: string | null;
  localEndereco: string | null;
  observacoes: string | null;
  mensagemConvite: string | null;
  caminhoDaImagem: string | null;
  tipoDaImagem: string | null;
  larguraDaImagem: number | null;
  alturaDaImagem: number | null;
  paleta: Paleta;
  maxAcompanhantes: number;
  fuso: string;
  atualizadoEm: Date;
}

/**
 * Uma arte do convite. Todas iguais menos por um detalhe, no caso do
 * Chá da Flora o tamanho da fralda sugerida.
 */
export interface Variante {
  codigo: string;
  descricao: string;
  posicao: number;
  caminhoDaImagem: string | null;
  tipoDaImagem: string | null;
  larguraDaImagem: number | null;
  alturaDaImagem: number | null;
  paleta: Paleta | null;
  /** Falso enquanto o organizador nao tiver enviado a arte desta variante. */
  temImagem: boolean;
}

export interface Acompanhante {
  id: string;
  nome: string;
  posicao: number;
}

export type StatusConvidado = 'nao-abriu' | 'sem-resposta' | 'confirmado' | 'recusado';

export interface Convidado {
  id: string;
  nome: string;
  telefone: string | null;
  token: string;
  primeiraAberturaEm: Date | null;
  ultimaAberturaEm: Date | null;
  totalDeAberturas: number;
  confirmadoEm: Date | null;
  recusadoEm: Date | null;
  criadoEm: Date;
  acompanhantes: Acompanhante[];
  status: StatusConvidado;
  /** Codigo da variante atribuida, ou null se ainda nao foi definida. */
  variante: string | null;
}

/** Numeros do topo do painel de acompanhamento. */
export interface ResumoDoPainel {
  cadastrados: number;
  abriram: number;
  naoAbriram: number;
  confirmados: number;
  recusaram: number;
  semResposta: number;
  pessoasConfirmadas: number;
}

export const ROTULOS_DE_STATUS: Record<StatusConvidado, string> = {
  'nao-abriu': 'Não abriu',
  'sem-resposta': 'Abriu, sem confirmar',
  confirmado: 'Confirmado',
  recusado: 'Não vai poder ir',
};

/** Resultado padrao devolvido por toda Server Action ao formulario. */
export type EstadoDeFormulario =
  | { estado: 'ocioso' }
  | { estado: 'erro'; mensagem: string }
  | { estado: 'sucesso'; mensagem?: string };

export const FORMULARIO_OCIOSO: EstadoDeFormulario = { estado: 'ocioso' };

/**
 * Estados devolvidos pelas Server Actions aos formularios.
 *
 * Moram aqui, e nao junto das proprias actions, por uma regra do Next: um
 * arquivo marcado com 'use server' so pode exportar funcoes assincronas.
 * Exportar uma constante de objeto de la derruba a pagina em tempo de
 * execucao, com "A 'use server' file can only export async functions".
 */

/** Resposta do convidado ao convite. */
export type EstadoDaResposta =
  | { estado: 'ocioso' }
  | { estado: 'erro'; mensagem: string }
  | { estado: 'confirmado' }
  | { estado: 'recusado' };

export const RESPOSTA_OCIOSA: EstadoDaResposta = { estado: 'ocioso' };

/** Entrada do organizador no painel. */
export type EstadoDoLogin =
  | { estado: 'ocioso' }
  | { estado: 'erro'; mensagem: string };

export const LOGIN_OCIOSO: EstadoDoLogin = { estado: 'ocioso' };
