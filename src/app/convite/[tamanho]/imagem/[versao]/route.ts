import { acharVariante, resolverArte, versaoDaArte } from '@/lib/arte';
import { codigoDeVarianteSchema } from '@/lib/validacao';
import { baixarImagemDoConvite, buscarEvento } from '@/server/evento';
import { listarVariantes } from '@/server/variantes';

/**
 * Serve a arte do link unico.
 *
 * O bucket do Storage e privado: esta rota le o arquivo no servidor e devolve
 * os bytes, para a pagina e para o robo de previa do WhatsApp.
 *
 * A versao da arte vai no caminho. Quando ela bate com a arte atual, o
 * arquivo daquele endereco nunca mais muda, e a resposta pode ficar em cache
 * por um ano. Uma arte nova ganha outro endereco, entao trocar a imagem no
 * painel aparece na hora para todo mundo. Versao velha, de uma pagina aberta
 * antes da troca, recebe a arte atual com cache curto.
 */
export const dynamic = 'force-dynamic';

function naoEncontrado(): Response {
  return new Response('Não encontrado', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

interface Contexto {
  params: Promise<{ tamanho: string; versao: string }>;
}

export async function GET(_request: Request, { params }: Contexto) {
  const { tamanho, versao } = await params;

  const codigo = codigoDeVarianteSchema.safeParse(tamanho);
  if (!codigo.success) return naoEncontrado();

  const [evento, variantes] = await Promise.all([buscarEvento(), listarVariantes()]);
  const arte = resolverArte(evento, acharVariante(variantes, codigo.data));
  if (!arte.caminho) return naoEncontrado();

  const imagem = await baixarImagemDoConvite(arte.caminho);
  if (!imagem) return naoEncontrado();

  const atual = versao === versaoDaArte(arte.caminho);

  return new Response(imagem.bytes, {
    status: 200,
    headers: {
      'content-type': arte.tipo ?? imagem.tipo,
      'content-length': String(imagem.bytes.byteLength),
      'cache-control': atual
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=60, s-maxage=60',
      'x-content-type-options': 'nosniff',
    },
  });
}
