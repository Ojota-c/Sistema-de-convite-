import 'server-only';

import { cache } from 'react';

import { lerPaleta, type Paleta } from '@/lib/paleta';
import type { VarianteRow } from '@/types/db';
import type { Variante } from '@/types/dominio';

import { balde, supabase } from './supabase';

/**
 * Artes do convite.
 *
 * Cada variante guarda a propria imagem e a propria paleta. No Chá da Flora
 * as tres sao quase identicas, mas nada impede que uma arte futura tenha
 * cores diferentes, e nesse caso a pagina do convidado se adapta sozinha.
 */

const COLUNAS =
  'code, descricao, posicao, image_path, image_mime, image_width, image_height, palette, updated_at';

function paraDominio(linha: VarianteRow): Variante {
  return {
    codigo: linha.code,
    descricao: linha.descricao,
    posicao: linha.posicao,
    caminhoDaImagem: linha.image_path,
    tipoDaImagem: linha.image_mime,
    larguraDaImagem: linha.image_width,
    alturaDaImagem: linha.image_height,
    paleta: linha.palette ? lerPaleta(linha.palette) : null,
    temImagem: Boolean(linha.image_path),
  };
}

/**
 * Lista as variantes na ordem de exibicao.
 *
 * Em cache por requisicao, como as demais leituras quentes: a pagina do
 * convidado precisa dela em generateMetadata e no corpo.
 */
export const listarVariantes = cache(async function listarVariantes(): Promise<
  Variante[]
> {
  const { data, error } = await supabase()
    .from('invite_variants')
    .select(COLUNAS)
    .order('posicao', { ascending: true });

  if (error) {
    // Sem variantes o sistema continua de pe, usando a imagem geral do evento.
    console.error('[variantes] falha ao listar:', error.message);
    return [];
  }

  return (data ?? []).map(paraDominio);
});

export interface ImagemDaVariante {
  bytes: ArrayBuffer;
  tipo: string;
  largura: number;
  altura: number;
  paleta: Paleta;
}

/**
 * Sobe a arte de uma variante e grava a paleta extraida dela.
 *
 * O nome do arquivo leva o codigo e o instante do envio, entao trocar a arte
 * nunca serve a versao antiga guardada em cache pela CDN ou pelo WhatsApp.
 */
export async function salvarImagemDaVariante(
  codigo: string,
  imagem: ImagemDaVariante,
): Promise<void> {
  const cliente = supabase();

  const { data: atual } = await cliente
    .from('invite_variants')
    .select('image_path')
    .eq('code', codigo)
    .maybeSingle();

  const extensao =
    imagem.tipo === 'image/png' ? 'png' : imagem.tipo === 'image/jpeg' ? 'jpg' : 'webp';
  const caminho = `variante-${codigo.toLowerCase()}-${Date.now()}.${extensao}`;

  const { error: erroDeUpload } = await cliente.storage
    .from(balde())
    .upload(caminho, imagem.bytes, {
      contentType: imagem.tipo,
      upsert: true,
      cacheControl: '86400',
    });

  if (erroDeUpload) {
    throw new Error(`Não foi possível enviar a arte: ${erroDeUpload.message}`);
  }

  const { error: erroDeBanco } = await cliente
    .from('invite_variants')
    .update({
      image_path: caminho,
      image_mime: imagem.tipo,
      image_width: imagem.largura,
      image_height: imagem.altura,
      palette: { ...imagem.paleta },
    })
    .eq('code', codigo);

  if (erroDeBanco) {
    await cliente.storage.from(balde()).remove([caminho]);
    throw new Error(`Não foi possível salvar a arte: ${erroDeBanco.message}`);
  }

  const anterior = atual?.image_path;
  if (anterior && anterior !== caminho) {
    const { error } = await cliente.storage.from(balde()).remove([anterior]);
    if (error) {
      console.error('[variantes] arte antiga não removida:', error.message);
    }
  }
}

/** Tira a arte de uma variante, que volta a usar a imagem geral do evento. */
export async function removerImagemDaVariante(codigo: string): Promise<void> {
  const cliente = supabase();

  const { data: atual } = await cliente
    .from('invite_variants')
    .select('image_path')
    .eq('code', codigo)
    .maybeSingle();

  const { error } = await cliente
    .from('invite_variants')
    .update({
      image_path: null,
      image_mime: null,
      image_width: null,
      image_height: null,
      palette: null,
    })
    .eq('code', codigo);

  if (error) {
    throw new Error(`Não foi possível remover a arte: ${error.message}`);
  }

  if (atual?.image_path) {
    await cliente.storage.from(balde()).remove([atual.image_path]);
  }
}

/** Renomeia a descricao de uma variante, por exemplo de P para "Recém-nascido". */
export async function salvarDescricaoDaVariante(
  codigo: string,
  descricao: string,
): Promise<void> {
  const { error } = await supabase()
    .from('invite_variants')
    .update({ descricao })
    .eq('code', codigo);

  if (error) {
    throw new Error(`Não foi possível salvar a descrição: ${error.message}`);
  }
}
