import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Convite não encontrado',
  robots: { index: false, follow: false },
};

/**
 * Token invalido, apagado, ou link truncado no caminho.
 *
 * A pagina e cuidada como as outras e nao revela nada: nem o nome do evento,
 * nem se o token chegou a existir um dia. Quem tentar adivinhar tokens recebe
 * sempre exatamente esta mesma tela.
 */
export default function ConviteNaoEncontrado() {
  return (
    <main className="textura-papel flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="cartao-convite moldura-interna entrada w-full max-w-[26rem] px-7 py-12 text-center sm:px-10">
        <p className="sobretitulo">Ops</p>

        <h1 className="titulo-secao mt-3">Convite não encontrado</h1>

        <div className="filete my-7" aria-hidden="true">
          <span className="filete-losango" />
        </div>

        <p className="text-[var(--cor-tinta-suave)]">
          O link pode ter vindo cortado pela metade. Isso acontece bastante
          quando a mensagem é encaminhada.
        </p>

        <p className="mt-5 text-[var(--cor-tinta-suave)]">
          Volte à conversa onde você recebeu o convite e toque no link inteiro.
          Se não der certo, peça para quem está organizando enviar de novo.
        </p>
      </div>
    </main>
  );
}
