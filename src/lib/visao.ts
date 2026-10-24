import {
  formatarDataExtenso,
  formatarDataHoraCurta,
  formatarFaixaDeHoras,
} from './datas';
import { localCompleto } from './calendario';
import { MENSAGEM_PADRAO, aplicarModelo, linkDoConvite, linkWhatsApp } from './whatsapp';

import type { Convidado, Evento, StatusConvidado } from '@/types/dominio';

/**
 * Prepara os dados para a interface do painel.
 *
 * Tudo que o componente de cliente recebe sai daqui ja pronto: datas em
 * texto, links montados, mensagem com os marcadores trocados. Assim nenhum
 * objeto Date e nenhuma regra de fuso precisa atravessar a fronteira entre
 * servidor e navegador.
 *
 * Funcao pura, entao da para testar a mensagem e os links sem subir nada.
 */

export interface LinhaDeConvidado {
  id: string;
  nome: string;
  telefone: string | null;
  token: string;
  status: StatusConvidado;
  acompanhantes: string[];
  totalDePessoas: number;
  totalDeAberturas: number;
  primeiraAberturaTexto: string | null;
  ultimaAberturaTexto: string | null;
  respostaTexto: string | null;
  link: string;
  mensagem: string;
  linkWhatsApp: string;
}

/** Texto de data e hora que entra na mensagem enviada ao convidado. */
export function textoDaDataDoEvento(evento: Evento): string {
  if (!evento.inicio) return '';
  const dia = formatarDataExtenso(evento.inicio, evento.fuso);
  const horas = formatarFaixaDeHoras(evento.inicio, evento.fim, evento.fuso);
  return `${dia}, ${horas}`;
}

/** Local em uma linha, como aparece na mensagem. */
export function textoDoLocalDoEvento(evento: Evento): string {
  return localCompleto(evento.localNome, evento.localEndereco) ?? '';
}

/** Monta a mensagem personalizada de um convidado. */
export function mensagemParaConvidado(
  evento: Evento,
  nome: string,
  link: string,
): string {
  return aplicarModelo(evento.mensagemConvite ?? MENSAGEM_PADRAO, {
    nome,
    evento: evento.titulo,
    data: textoDaDataDoEvento(evento),
    local: textoDoLocalDoEvento(evento),
    link,
  });
}

export function montarLinha(
  convidado: Convidado,
  evento: Evento,
  urlBase: string,
): LinhaDeConvidado {
  const link = linkDoConvite(urlBase, convidado.token);
  const mensagem = mensagemParaConvidado(evento, convidado.nome, link);
  const resposta = convidado.confirmadoEm ?? convidado.recusadoEm;

  return {
    id: convidado.id,
    nome: convidado.nome,
    telefone: convidado.telefone,
    token: convidado.token,
    status: convidado.status,
    acompanhantes: convidado.acompanhantes.map((a) => a.nome),
    totalDePessoas:
      convidado.status === 'confirmado' ? 1 + convidado.acompanhantes.length : 0,
    totalDeAberturas: convidado.totalDeAberturas,
    primeiraAberturaTexto: convidado.primeiraAberturaEm
      ? formatarDataHoraCurta(convidado.primeiraAberturaEm, evento.fuso)
      : null,
    ultimaAberturaTexto: convidado.ultimaAberturaEm
      ? formatarDataHoraCurta(convidado.ultimaAberturaEm, evento.fuso)
      : null,
    respostaTexto: resposta ? formatarDataHoraCurta(resposta, evento.fuso) : null,
    link,
    mensagem,
    linkWhatsApp: linkWhatsApp(convidado.telefone, mensagem),
  };
}

export function montarLinhas(
  convidados: readonly Convidado[],
  evento: Evento,
  urlBase: string,
): LinhaDeConvidado[] {
  return convidados.map((convidado) => montarLinha(convidado, evento, urlBase));
}
