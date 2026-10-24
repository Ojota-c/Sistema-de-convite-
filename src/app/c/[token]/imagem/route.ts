import { createHash } from 'node:crypto';

import { normalizarToken } from '@/lib/token';
import { tokenExiste } from '@/server/convidados';
import { baixarImagemDoConvite, buscarEvento } from '@/server/evento';

/**
 * Serve a imagem do convite.
 *
 * O bucket do Storage e privado. Esta rota le o arquivo no servidor, com a
 * service role, e devolve os bytes. Com isso:
 *
 *   - nenhuma URL do Supabase, assinada ou publica, chega ao navegador;
 *   - o robo de previa do WhatsApp consegue buscar a imagem, que e o que faz
 *     o convite aparecer na conversa;
 *   - a resposta fica em cache na CDN, entao a imagem nao e lida do Storage a
 *     cada visita, o que mantem o consumo dentro do plano gratuito.
 *
 * O token e conferido antes de qualquer leitura, para a rota nao virar um
 * proxy aberto de arquivos.
 */
export const dynamic = 'force-dynamic';

/**
 * Resposta nova a cada chamada. Um Response guardado em modulo nao pode ser
 * reaproveitado entre requisicoes: o corpo dele e um stream de uso unico.
 */
function naoEncontrado(): Response {
  return new Response('Não encontrado', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

interface Contexto {
  params: Promise<{ token: string }>;
}

export async function GET(request: Request, { params }: Contexto) {
  const token = normalizarToken((await params).token);
  if (!token) return naoEncontrado();

  const [existe, evento] = await Promise.all([tokenExiste(token), buscarEvento()]);
  if (!existe || !evento.caminhoDaImagem) return naoEncontrado();

  // O caminho do arquivo ja carrega o instante do upload, entao ele muda
  // sempre que a imagem e trocada e serve bem como identidade da versao.
  const etag = `"${createHash('sha1').update(evento.caminhoDaImagem).digest('hex')}"`;

  const cacheControl =
    'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800';

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, {
      status: 304,
      headers: { etag, 'cache-control': cacheControl },
    });
  }

  const imagem = await baixarImagemDoConvite(evento.caminhoDaImagem);
  if (!imagem) return naoEncontrado();

  return new Response(imagem.bytes, {
    status: 200,
    headers: {
      'content-type': evento.tipoDaImagem ?? imagem.tipo,
      'content-length': String(imagem.bytes.byteLength),
      'cache-control': cacheControl,
      etag,
      'x-content-type-options': 'nosniff',
    },
  });
}
