import type { Metadata } from 'next';

import { ConviteAberto, metadadosDoConvite } from './convite/conteudo';

/**
 * Raiz do site: o mesmo convite do link unico, para quem digitar so o
 * endereco do site tambem conseguir responder.
 */
export const dynamic = 'force-dynamic';

export function generateMetadata(): Promise<Metadata> {
  return metadadosDoConvite(null);
}

export default function PaginaInicial() {
  return <ConviteAberto codigo={null} />;
}
