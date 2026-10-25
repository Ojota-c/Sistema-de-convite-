import { createHash } from 'node:crypto';

import { buscarEvento, baixarImagemDoConvite } from '@/server/evento';
import { sessaoAtiva } from '@/server/sessao';
import { listarVariantes } from '@/server/variantes';

/**
 * Serve a arte de uma variante para o painel.
 *
 * Existe porque a rota publica /c/[token]/imagem precisa de um convidado, e o
 * organizador tem de conseguir ver a arte antes de cadastrar qualquer pessoa.
 * Sem isto, uma variante recem-enviada aparecia como "falta a arte" ate
 * alguem receber aquele tamanho, o que e simplesmente falso.
 *
 * So responde para quem tem sessao de organizador.
 *
 * O codigo "evento" devolve a imagem geral, que e a rede de seguranca usada
 * por quem ainda nao tem tamanho definido.
 */
export const dynamic = 'force-dynamic';

const CODIGO_DO_EVENTO = 'evento';

function naoEncontrado(): Response {
  return new Response('Não encontrado', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

interface Contexto {
  params: Promise<{ codigo: string }>;
}

export async function GET(request: Request, { params }: Contexto) {
  if (!(await sessaoAtiva())) {
    return new Response('Não autorizado', { status: 401 });
  }

  const codigo = (await params).codigo.trim().toUpperCase();

  let caminho: string | null = null;
  let tipo: string | null = null;

  if (codigo === CODIGO_DO_EVENTO.toUpperCase()) {
    const evento = await buscarEvento();
    caminho = evento.caminhoDaImagem;
    tipo = evento.tipoDaImagem;
  } else {
    const variante = (await listarVariantes()).find((v) => v.codigo.toUpperCase() === codigo);
    caminho = variante?.caminhoDaImagem ?? null;
    tipo = variante?.tipoDaImagem ?? null;
  }

  if (!caminho) return naoEncontrado();

  const etag = `"${createHash('sha1').update(caminho).digest('hex')}"`;
  // Cache so no navegador do organizador, nunca em CDN compartilhada: a
  // resposta depende da sessao dele.
  const cacheControl = 'private, max-age=300';

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, {
      status: 304,
      headers: { etag, 'cache-control': cacheControl },
    });
  }

  const imagem = await baixarImagemDoConvite(caminho);
  if (!imagem) return naoEncontrado();

  return new Response(imagem.bytes, {
    status: 200,
    headers: {
      'content-type': tipo ?? imagem.tipo,
      'content-length': String(imagem.bytes.byteLength),
      'cache-control': cacheControl,
      etag,
      'x-content-type-options': 'nosniff',
    },
  });
}
