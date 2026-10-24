import { redirect } from 'next/navigation';

import { FormularioDeLogin } from '@/components/admin/FormularioDeLogin';
import { sessaoAtiva } from '@/server/sessao';

export const dynamic = 'force-dynamic';

/**
 * Entrada do organizador. Uma senha, sem cadastro e sem recuperacao: quem
 * esquecer troca a ADMIN_PASSWORD no painel da Vercel.
 */
export default async function PaginaDeLogin() {
  if (await sessaoAtiva()) {
    redirect('/admin');
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="painel-caixa entrada w-full max-w-[23rem] px-7 py-10">
        <p className="sobretitulo">Chá de bebê</p>
        <h1 className="titulo-secao mt-2">Painel do organizador</h1>

        <p className="mt-3 text-sm text-[var(--cor-tinta-suave)]">
          Esta área é só para quem está organizando a festa.
        </p>

        <div className="filete my-7" aria-hidden="true">
          <span className="filete-losango" />
        </div>

        <FormularioDeLogin />
      </div>
    </main>
  );
}
