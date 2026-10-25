import { createHash } from 'node:crypto';

import { acharVariante, resolverArte } from '@/lib/arte';
import { normalizarToken } from '@/lib/token';
import { buscarConvidadoPorToken } from '@/server/convidados';
import { baixarImagemDoConvite, buscarEvento } from '@/server/evento';
import { listarVariantes } from '@/server/variantes';

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
 *
 * A imagem servida e a da variante do convidado, de modo que cada pessoa
 * receba a arte com o tamanho de fralda que foi atribuido a ela, tanto na
 * pagina quanto na previa do WhatsApp.
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

  const [convidado, evento, variantes] = await Promise.all([
    buscarConvidadoPorToken(token),
    buscarEvento(),
    listarVariantes(),
  ]);
  if (!convidado) return naoEncontrado();

  const arte = resolverArte(evento, acharVariante(variantes, convidado.variante));
  if (!arte.caminho) return naoEncontrado();

  // O caminho do arquivo ja carrega o instante do upload, entao ele muda
  // sempre que a imagem e trocada e serve bem como identidade da versao.
  const etag = `"${createHash('sha1').update(arte.caminho).digest('hex')}"`;

  // Curto de proposito: este endereco nao muda quando a arte e trocada, e um
  // cache longo continuava servindo a arte antiga por um dia inteiro. As
  // paginas mandam ?v= com a versao, que ja contorna o cache do navegador.
  const cacheControl = 'public, max-age=300, s-maxage=300';

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, {
      status: 304,
      headers: { etag, 'cache-control': cacheControl },
    });
  }

  const imagem = await baixarImagemDoConvite(arte.caminho);
  if (!imagem) return naoEncontrado();

  return new Response(imagem.bytes, {
    status: 200,
    headers: {
      'content-type': arte.tipo ?? imagem.tipo,
      'content-length': String(imagem.bytes.byteLength),
      'cache-control': cacheControl,
      etag,
      'x-content-type-options': 'nosniff',
    },
  });
}
