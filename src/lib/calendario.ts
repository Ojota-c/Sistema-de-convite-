import { formatarInstanteIcs } from './ics';

/**
 * Link de criacao de evento no Google Agenda.
 *
 * Os horarios vao em UTC com sufixo Z, igual ao .ics. Com instantes absolutos
 * nao e preciso mandar ctz, e o evento cai na hora certa qualquer que seja o
 * fuso configurado na conta de quem clica.
 */

const BASE_GOOGLE = 'https://calendar.google.com/calendar/render';
const TRES_HORAS_EM_MS = 3 * 60 * 60 * 1000;

export interface EntradaGoogleAgenda {
  titulo: string;
  inicio: Date;
  fim?: Date | null;
  descricao?: string | null;
  local?: string | null;
}

export function linkGoogleAgenda(entrada: EntradaGoogleAgenda): string {
  const { titulo, inicio, descricao = null, local = null } = entrada;

  if (Number.isNaN(inicio.getTime())) {
    throw new Error('O evento precisa de uma data de inicio valida.');
  }

  const fim =
    entrada.fim && !Number.isNaN(entrada.fim.getTime()) && entrada.fim > inicio
      ? entrada.fim
      : new Date(inicio.getTime() + TRES_HORAS_EM_MS);

  const parametros = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo,
    dates: `${formatarInstanteIcs(inicio)}/${formatarInstanteIcs(fim)}`,
  });

  if (descricao && descricao.trim().length > 0) {
    parametros.set('details', descricao.trim());
  }
  if (local && local.trim().length > 0) {
    parametros.set('location', local.trim());
  }

  return `${BASE_GOOGLE}?${parametros.toString()}`;
}

/** Texto curto que acompanha o evento nas duas agendas. */
export function descricaoDoEvento(partes: {
  observacoes?: string | null;
  endereco?: string | null;
  linkDoConvite?: string | null;
}): string {
  const linhas: string[] = [];
  if (partes.observacoes && partes.observacoes.trim().length > 0) {
    linhas.push(partes.observacoes.trim());
  }
  if (partes.endereco && partes.endereco.trim().length > 0) {
    linhas.push(`Endereço: ${partes.endereco.trim()}`);
  }
  if (partes.linkDoConvite && partes.linkDoConvite.trim().length > 0) {
    linhas.push(`Convite: ${partes.linkDoConvite.trim()}`);
  }
  return linhas.join('\n');
}

/** Junta nome e endereco em uma linha so, para o campo de local. */
export function localCompleto(
  nome?: string | null,
  endereco?: string | null,
): string | null {
  const partes = [nome, endereco]
    .map((p) => (p ?? '').trim())
    .filter((p) => p.length > 0);
  return partes.length > 0 ? partes.join(' - ') : null;
}
