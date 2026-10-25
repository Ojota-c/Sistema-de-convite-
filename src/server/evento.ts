import 'server-only';

import { cache } from 'react';

import { horaLocalParaUtc, paraData } from '@/lib/datas';
import { lerLinhaDoLink } from '@/lib/linha-do-link';
import { lerPaleta } from '@/lib/paleta';
import type { DadosEvento } from '@/lib/validacao';
import type { EventoRow } from '@/types/db';
import type { Evento } from '@/types/dominio';

import { balde, supabase } from './supabase';

/**
 * Leitura e escrita do evento, que ocupa uma unica linha da tabela `event`.
 */

const ID_DO_EVENTO = 1;

const COLUNAS_DO_EVENTO =
  'id, title, starts_at, ends_at, location_name, location_address, notes, invite_message, image_path, image_mime, image_width, image_height, palette, max_companions, timezone, link_na_arte, updated_at';

/** Evento vazio, usado antes de o organizador preencher qualquer coisa. */
function eventoVazio(): Evento {
  return {
    titulo: 'Chá de Bebê',
    inicio: null,
    fim: null,
    localNome: null,
    localEndereco: null,
    observacoes: null,
    mensagemConvite: null,
    caminhoDaImagem: null,
    tipoDaImagem: null,
    larguraDaImagem: null,
    alturaDaImagem: null,
    paleta: lerPaleta(null),
    maxAcompanhantes: 3,
    fuso: 'America/Sao_Paulo',
    linhaDoLink: lerLinhaDoLink(null),
    atualizadoEm: new Date(0),
  };
}

function paraDominio(linha: EventoRow): Evento {
  return {
    titulo: linha.title,
    inicio: paraData(linha.starts_at),
    fim: paraData(linha.ends_at),
    localNome: linha.location_name,
    localEndereco: linha.location_address,
    observacoes: linha.notes,
    mensagemConvite: linha.invite_message,
    caminhoDaImagem: linha.image_path,
    tipoDaImagem: linha.image_mime,
    larguraDaImagem: linha.image_width,
    alturaDaImagem: linha.image_height,
    paleta: lerPaleta(linha.palette),
    maxAcompanhantes: linha.max_companions,
    fuso: linha.timezone,
    linhaDoLink: lerLinhaDoLink(linha.link_na_arte),
    atualizadoEm: paraData(linha.updated_at) ?? new Date(0),
  };
}

/**
 * Le o evento. Nunca lanca: sem linha, devolve o evento vazio.
 *
 * Envolvida em cache() do React para nao repetir a consulta dentro da mesma
 * requisicao. A pagina do convidado precisa do evento duas vezes, uma em
 * generateMetadata e outra no corpo, e seria uma ida ao banco a mais por
 * visita, no caminho mais quente do sistema.
 */
export const buscarEvento = cache(async function buscarEvento(): Promise<Evento> {
  const { data, error } = await supabase()
    .from('event')
    .select(COLUNAS_DO_EVENTO)
    .eq('id', ID_DO_EVENTO)
    .maybeSingle();

  if (error) {
    console.error('[evento] falha ao ler o evento:', error.message);
    return eventoVazio();
  }

  return data ? paraDominio(data) : eventoVazio();
});

/** Grava os campos preenchidos pelo organizador. */
export async function salvarEvento(dados: DadosEvento): Promise<void> {
  const fuso = (await buscarEvento()).fuso;

  const { error } = await supabase()
    .from('event')
    .update({
      title: dados.titulo,
      starts_at: horaLocalParaUtc(dados.inicio, fuso).toISOString(),
      ends_at: dados.fim ? horaLocalParaUtc(dados.fim, fuso).toISOString() : null,
      location_name: dados.localNome,
      location_address: dados.localEndereco,
      notes: dados.observacoes,
      invite_message: dados.mensagemConvite,
      max_companions: dados.maxAcompanhantes,
    })
    .eq('id', ID_DO_EVENTO);

  if (error) {
    throw new Error(`Não foi possível salvar o evento: ${error.message}`);
  }
}

export interface ImagemBaixada {
  bytes: ArrayBuffer;
  tipo: string;
}

/**
 * Le a imagem do bucket privado.
 *
 * E assim que a imagem chega ao navegador do convidado e ao robo de previa do
 * WhatsApp, pela rota /c/[token]/imagem. O bucket continua fechado e nenhuma
 * URL assinada precisa circular.
 */
export async function baixarImagemDoConvite(
  caminho: string,
): Promise<ImagemBaixada | null> {
  const { data, error } = await supabase().storage.from(balde()).download(caminho);

  if (error || !data) {
    console.error('[evento] falha ao baixar a imagem:', error?.message);
    return null;
  }

  return {
    bytes: await data.arrayBuffer(),
    tipo: data.type || 'application/octet-stream',
  };
}
