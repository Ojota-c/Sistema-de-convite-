import { ListaDeAcompanhamento } from '@/components/admin/ListaDeAcompanhamento';
import { resumir } from '@/lib/painel';
import { montarLinhas } from '@/lib/visao';
import { urlBase } from '@/server/ambiente';
import { listarConvidados } from '@/server/convidados';
import { buscarEvento } from '@/server/evento';
import { exigirAdmin } from '@/server/sessao';

export const dynamic = 'force-dynamic';

/**
 * Acompanhamento: os numeros no topo e a lista completa logo abaixo.
 */
export default async function PaginaDeAcompanhamento() {
  await exigirAdmin();

  const [convidados, evento] = await Promise.all([listarConvidados(), buscarEvento()]);
  const resumo = resumir(convidados);
  const linhas = montarLinhas(convidados, evento, urlBase());

  const cartoes = [
    { rotulo: 'Convidados', valor: resumo.cadastrados, nota: 'cadastrados' },
    { rotulo: 'Abriram', valor: resumo.abriram, nota: `de ${resumo.cadastrados}` },
    { rotulo: 'Confirmaram', valor: resumo.confirmados, nota: 'convites' },
    {
      rotulo: 'Pessoas',
      valor: resumo.pessoasConfirmadas,
      nota: 'com acompanhantes',
      destaque: true,
    },
    { rotulo: 'Não abriram', valor: resumo.naoAbriram, nota: 'ainda' },
  ];

  return (
    <div className="space-y-10">
      <section aria-labelledby="titulo-resumo">
        <h1 id="titulo-resumo" className="titulo-secao">
          Como está a festa
        </h1>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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

        {resumo.recusaram > 0 ? (
          <p className="mt-3 text-sm text-[var(--cor-tinta-suave)]">
            {resumo.recusaram === 1
              ? '1 pessoa avisou que não vai poder ir.'
              : `${resumo.recusaram} pessoas avisaram que não vão poder ir.`}
          </p>
        ) : null}
      </section>

      <ListaDeAcompanhamento linhas={linhas} />
    </div>
  );
}
