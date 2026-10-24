'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { sairAction } from '@/app/admin/acoes';

const ABAS = [
  { href: '/admin', rotulo: 'Acompanhamento' },
  { href: '/admin/convite', rotulo: 'Convite' },
  { href: '/admin/convidados', rotulo: 'Convidados' },
] as const;

export function NavegacaoDoPainel() {
  const caminho = usePathname();

  return (
    <header className="border-b border-[var(--cor-borda)] bg-[var(--cor-papel)]">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="flex items-baseline justify-between gap-4 pt-5">
          <p className="sobretitulo">Chá de bebê</p>

          <form action={sairAction}>
            <button type="submit" className="botao-texto text-sm">
              Sair
            </button>
          </form>
        </div>

        <nav aria-label="Seções do painel">
          <ul className="rolagem-suave -mb-px flex gap-1">
            {ABAS.map((aba) => {
              const ativa =
                aba.href === '/admin' ? caminho === '/admin' : caminho.startsWith(aba.href);

              return (
                <li key={aba.href}>
                  <Link
                    href={aba.href}
                    aria-current={ativa ? 'page' : undefined}
                    className={`inline-flex min-h-[var(--toque-minimo)] items-center whitespace-nowrap border-b-2 px-3 text-[0.95rem] transition-colors ${
                      ativa
                        ? 'border-[var(--cor-destaque)] font-medium text-[var(--cor-tinta)]'
                        : 'border-transparent text-[var(--cor-tinta-suave)] hover:text-[var(--cor-tinta)]'
                    }`}
                  >
                    {aba.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
