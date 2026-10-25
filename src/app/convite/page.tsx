import type { Metadata } from 'next';

import { ConviteAberto, metadadosDoConvite } from './conteudo';

/**
 * Endereco curto do link unico, sem tamanho.
 * Mostra a primeira arte que ja foi enviada.
 */
export const dynamic = 'force-dynamic';

export function generateMetadata(): Promise<Metadata> {
  return metadadosDoConvite(null);
}

export default function PaginaDoConviteAberto() {
  return <ConviteAberto codigo={null} />;
}
