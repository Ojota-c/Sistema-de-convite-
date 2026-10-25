import type { Metadata } from 'next';

import { ConviteAberto, lerCodigoDaUrl, metadadosDoConvite } from '../conteudo';

/**
 * Link unico com a arte escolhida por quem enviou: /convite/p, /convite/m,
 * /convite/g. Renderizada a cada requisicao, porque mostra a resposta de quem
 * ja respondeu por aquele celular.
 */
export const dynamic = 'force-dynamic';

interface PropsDaPagina {
  params: Promise<{ tamanho: string }>;
}

export async function generateMetadata({ params }: PropsDaPagina): Promise<Metadata> {
  return metadadosDoConvite(lerCodigoDaUrl((await params).tamanho));
}

export default async function PaginaDoConviteAberto({ params }: PropsDaPagina) {
  return <ConviteAberto codigo={lerCodigoDaUrl((await params).tamanho)} />;
}
