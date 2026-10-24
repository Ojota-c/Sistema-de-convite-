import type { Evento } from '@/types/dominio';

export interface CartaoDoConviteProps {
  evento: Evento;
  /** Caminho da rota que serve a imagem deste convite. */
  caminhoDaImagem: string | null;
  dataPorExtenso: string | null;
  faixaDeHoras: string | null;
}

/**
 * O convite propriamente dito.
 *
 * A imagem usa a tag img comum, sem o otimizador do Next, por dois motivos:
 * ela ja chega redimensionada e comprimida do painel, e o otimizador de
 * imagens da Vercel tem cota no plano gratuito. Servir o arquivo direto
 * mantem o custo de infraestrutura em zero.
 */
export function CartaoDoConvite({
  evento,
  caminhoDaImagem,
  dataPorExtenso,
  faixaDeHoras,
}: CartaoDoConviteProps) {
  const temLocal = Boolean(evento.localNome ?? evento.localEndereco);

  return (
    <article className="cartao-convite moldura-interna overflow-hidden">
      {caminhoDaImagem ? (
        <div className="border-b border-[var(--cor-borda)] bg-[var(--cor-fundo)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- rota propria, sem otimizador, para manter o plano gratuito */}
          <img
            src={caminhoDaImagem}
            alt={`Convite do evento ${evento.titulo}`}
            width={evento.larguraDaImagem ?? undefined}
            height={evento.alturaDaImagem ?? undefined}
            className="block h-auto w-full"
            fetchPriority="high"
            decoding="async"
          />
        </div>
      ) : null}

      <div className="px-6 py-10 text-center sm:px-10 sm:py-12">
        <p className="sobretitulo">Com alegria, convidamos você</p>

        <h1 className="titulo-convite mt-4">{evento.titulo}</h1>

        <div className="filete my-8" aria-hidden="true">
          <span className="filete-losango" />
        </div>

        <dl className="space-y-5">
          {dataPorExtenso ? (
            <div>
              <dt className="sobretitulo text-[0.68rem]">Quando</dt>
              <dd className="texto-destacado mt-1.5">
                {dataPorExtenso}
                {faixaDeHoras ? (
                  <>
                    <br />
                    {faixaDeHoras}
                  </>
                ) : null}
              </dd>
            </div>
          ) : null}

          {temLocal ? (
            <div>
              <dt className="sobretitulo text-[0.68rem]">Onde</dt>
              <dd className="texto-destacado mt-1.5">
                {evento.localNome ? <span>{evento.localNome}</span> : null}
                {evento.localNome && evento.localEndereco ? <br /> : null}
                {evento.localEndereco ? (
                  <span className="text-[0.95rem] text-[var(--cor-tinta-suave)]">
                    {evento.localEndereco}
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
        </dl>

        {evento.observacoes ? (
          <p className="medida mx-auto mt-8 whitespace-pre-line text-[0.95rem] text-[var(--cor-tinta-suave)]">
            {evento.observacoes}
          </p>
        ) : null}
      </div>
    </article>
  );
}
