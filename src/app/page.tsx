import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Convite',
};

/**
 * Raiz do site.
 *
 * Nao conta nada sobre o evento: nem titulo, nem data, nem local, nem quantos
 * convidados existem. Quem chega aqui sem link personalizado nao deve
 * descobrir que festa e essa. O caminho do painel aparece porque o endereco
 * /admin ja e previsivel de qualquer jeito, e ele exige senha.
 */
export default function PaginaInicial() {
  return (
    <main className="textura-papel flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="medida entrada text-center">
        <p className="sobretitulo">Convite</p>

        <h1 className="titulo-secao mt-4">Este convite é pessoal</h1>

        <div className="filete my-7" aria-hidden="true">
          <span className="filete-losango" />
        </div>

        <p className="text-[var(--cor-tinta-suave)]">
          Cada pessoa convidada recebe um link próprio. Procure a mensagem que
          chegou para você e abra o link de lá para ver o convite e confirmar
          sua presença.
        </p>

        <p className="mt-10 text-sm text-[var(--cor-tinta-suave)]">
          <a
            href="/admin"
            className="underline decoration-1 underline-offset-4 hover:text-[var(--cor-tinta)]"
          >
            Sou quem está organizando
          </a>
        </p>
      </div>
    </main>
  );
}
