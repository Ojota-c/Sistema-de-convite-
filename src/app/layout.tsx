import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { classeDasFontes } from '@/styles/fontes';

import './globals.css';

/**
 * Nenhum metadado daqui revela o evento: o titulo e a descricao especificos
 * ficam na pagina do convidado, que e a unica a conhecer o token.
 *
 * A indexacao fica desligada no site inteiro. Um convite com token na URL nao
 * tem por que aparecer em buscador nenhum.
 */
export const metadata: Metadata = {
  title: 'Convite',
  description: 'Página de convite com confirmação de presença.',
  robots: { index: false, follow: false, nocache: true },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f2ece1',
};

export default function LayoutRaiz({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={classeDasFontes}>
      <body>{children}</body>
    </html>
  );
}
