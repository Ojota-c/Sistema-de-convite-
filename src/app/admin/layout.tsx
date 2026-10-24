import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Painel do organizador',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Casca visual do painel.
 *
 * O atributo data-tema troca a paleta inteira para a identidade sobria do
 * organizador, independente da imagem do convite. A tipografia continua a
 * mesma, entao os dois lados do sistema parecem da mesma familia.
 *
 * Aqui nao ha verificacao de sessao: este layout tambem envolve a tela de
 * login. A barreira fica no layout do grupo (protegido) e no topo de cada
 * pagina e de cada action.
 */
export default function LayoutDoAdmin({ children }: { children: ReactNode }) {
  return (
    <div data-tema="painel" className="min-h-dvh">
      {children}
    </div>
  );
}
