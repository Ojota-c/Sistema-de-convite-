import { ListaDeAcompanhamento } from '@/components/admin/ListaDeAcompanhamento';
import { contarPorVariante } from '@/lib/arte';
import { resumir } from '@/lib/painel';
import { montarLinhas } from '@/lib/visao';
import { urlBase } from '@/server/ambiente';
import { listarConvidados } from '@/server/convidados';
import { buscarEvento } from '@/server/evento';
import { exigirAdmin } from '@/server/sessao';
import { listarVariantes } from '@/server/variantes';

export const dynamic = 'force-dynamic';

/**
 * Aba Convidados: os numeros no topo e a lista de quem respondeu logo abaixo.
 * Ninguem e cadastrado a mao: cada pessoa que responde pelo link entra aqui
 * sozinha, confirmando ou avisando que nao vai.
 */
export default async function PaginaDeAcompanhamento() {
  await exigirAdmin();

  const [convidados, evento, variantes] = await Promise.all([
    listarConvidados(),
    buscarEvento(),
    listarVariantes(),
  ]);
  const resumo = resumir(convidados);
  const linhas = montarLinhas(convidados, evento, urlBase());
  // Fralda vem de quem vai: so contam as respostas confirmadas.
  const confirmados = convidados.filter((c) => c.status === 'confirmado');
  const porVariante = contarPorVariante(confirmados, variantes);

  const cartoes = [
    {
      rotulo: 'Pessoas',
      valor: resumo.pessoasConfirmadas,
      nota: 'confirmadas, com acompanhantes',
      destaque: true,
    },
    { rotulo: 'Confirmaram', valor: resumo.confirmados, nota: 'respostas' },
    { rotulo: 'Não vão', valor: resumo.recusaram, nota: 'avisaram' },
  ];

  return (
    <div className="space-y-10">
      <section aria-labelledby="titulo-resumo">
        <h1 id="titulo-resumo" className="titulo-secao">
          Como está a festa
        </h1>

        <dl className="mt-5 grid grid-cols-3 gap-3">
          {cartoes.map((cartao) => (
            <div
              key={cartao.rotulo}
              className={`painel-caixa px-4 py-4 ${
                cartao.destaque ? 'border-[var(--cor-destaque)]' : ''
              }`}
            >
              <dt className="sobretitulo text-[0.68rem]">{cartao.rotulo}</dt>
              <dd className="painel-numero mt-2">{cartao.valor}</dd>
              <p className="mt-1 text-xs text-[var(--cor-tinta-suave)]">{cartao.nota}</p>
            </div>
          ))}
        </dl>

      </section>

      {porVariante.length > 0 && confirmados.length > 0 ? (
        <section aria-labelledby="titulo-variantes">
          <h2 id="titulo-variantes" className="titulo-secao">
            Fraldas por tamanho
          </h2>
          <p className="mt-2 text-sm text-[var(--cor-tinta-suave)]">
            Quantas confirmações chegaram por cada arte. Serve para estimar
            quanto vai chegar de cada tamanho.
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {porVariante.map((linha) => (
              <div
                key={linha.codigo || 'sem-tamanho'}
                className={`painel-caixa px-4 py-4 ${
                  linha.codigo === '' && linha.total > 0
                    ? 'border-[#e4d4ab] bg-[#fcf6e8]'
                    : ''
                }`}
              >
                <dt className="sobretitulo text-[0.68rem]">{linha.descricao}</dt>
                <dd className="painel-numero mt-2">{linha.total}</dd>
                <p className="mt-1 text-xs text-[var(--cor-tinta-suave)]">
                  {linha.total === 1 ? 'confirmação' : 'confirmações'}
                </p>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <ListaDeAcompanhamento linhas={linhas} />
    </div>
  );
}
