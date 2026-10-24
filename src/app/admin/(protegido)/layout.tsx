import type { ReactNode } from 'react';

import { AtualizarAoFocar } from '@/components/admin/AtualizarAoFocar';
import { NavegacaoDoPainel } from '@/components/admin/NavegacaoDoPainel';
import { exigirAdmin } from '@/server/sessao';

/**
 * Casca das paginas protegidas.
 *
 * O grupo de rota (protegido) nao aparece na URL: /admin, /admin/convite e
 * /admin/convidados continuam iguais. Ele existe para que a tela de login,
 * que fica fora do grupo, nao caia na barreira abaixo.
 *
 * Cada pagina do grupo chama exigirAdmin() de novo. Repetir e barato, e
 * garante que uma pagina nova criada no futuro nao fique desprotegida por
 * descuido.
 */
export default async function LayoutProtegido({ children }: { children: ReactNode }) {
  await exigirAdmin();

  return (
    <>
      <AtualizarAoFocar />
      <NavegacaoDoPainel />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </>
  );
}
