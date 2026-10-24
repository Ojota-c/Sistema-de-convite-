import {
  removerArteDaVarianteAction,
  removerImagemAction,
  salvarArteDaVarianteAction,
  salvarImagemAction,
} from '@/app/admin/acoes';
import { EnvioDeArte } from '@/components/admin/EnvioDeArte';
import { FormularioDoEvento } from '@/components/admin/FormularioDoEvento';
import { variantesSemArte } from '@/lib/arte';
import { utcParaHoraLocal } from '@/lib/datas';
import { textoDaDataDoEvento, textoDoLocalDoEvento } from '@/lib/visao';
import { urlBase } from '@/server/ambiente';
import { listarConvidados } from '@/server/convidados';
import { buscarEvento } from '@/server/evento';
import { exigirAdmin } from '@/server/sessao';
import { listarVariantes } from '@/server/variantes';

export const dynamic = 'force-dynamic';

/**
 * Edicao do convite: as artes, os dados do evento e a mensagem de envio.
 *
 * As previas apontam para a rota de um convidado real de cada variante,
 * porque e assim que o arquivo e servido de verdade. Sem ninguem cadastrado
 * naquela variante, so aparece a imagem recem-escolhida, ainda local.
 */
export default async function PaginaDoConvite() {
  await exigirAdmin();

  const [evento, convidados, variantes] = await Promise.all([
    buscarEvento(),
    listarConvidados(),
    listarVariantes(),
  ]);

  /** Um token que já tenha esta variante, para a prévia mostrar a arte certa. */
  function tokenDaVariante(codigo: string): string | null {
    return convidados.find((c) => c.variante === codigo)?.token ?? null;
  }

  const primeiroToken = convidados[0]?.token ?? null;
  const exemploDeLink = `${urlBase()}/c/${primeiroToken ?? 'exemplo'}`;
  const faltando = variantesSemArte(variantes);

  return (
    <div className="space-y-12">
      <section aria-labelledby="titulo-artes">
        <h1 id="titulo-artes" className="titulo-secao">
          As artes do convite
        </h1>
        <p className="mt-2 text-sm text-[var(--cor-tinta-suave)]">
          Cada convidado recebe uma destas artes, conforme o tamanho de fralda
          que você atribuir a ele na aba Convidados. A arte aparece no topo da
          página e também na prévia do link no WhatsApp.
        </p>

        {faltando.length > 0 ? (
          <p className="mt-3 rounded-sm border border-[#e4d4ab] bg-[#fcf6e8] px-4 py-3 text-sm text-[#8a6a24]">
            Falta enviar a arte de: {faltando.map((v) => v.descricao).join(', ')}.
            Quem receber uma dessas vai ver a imagem geral do evento até lá.
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {variantes.map((variante) => {
            const token = tokenDaVariante(variante.codigo);
            return (
              <EnvioDeArte
                key={variante.codigo}
                id={`variante-${variante.codigo}`}
                rotulo={variante.descricao}
                ajuda={`Código ${variante.codigo}`}
                imagemAtual={
                  variante.temImagem && token ? `/c/${token}/imagem` : null
                }
                textoAlternativo={`Arte do convite para ${variante.descricao}`}
                acaoSalvar={salvarArteDaVarianteAction}
                acaoRemover={removerArteDaVarianteAction}
                camposExtras={{ codigo: variante.codigo }}
                compacto
              />
            );
          })}
        </div>

        {variantes.length === 0 ? (
          <p className="painel-caixa mt-5 px-6 py-8 text-center text-sm text-[var(--cor-tinta-suave)]">
            Nenhuma variante cadastrada. Rode a migration 0004_variantes.sql no
            SQL Editor do Supabase para criar as três.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="titulo-imagem-geral">
        <h2 id="titulo-imagem-geral" className="titulo-secao">
          Imagem geral
        </h2>
        <p className="mt-2 text-sm text-[var(--cor-tinta-suave)]">
          Rede de segurança: é a imagem que aparece para quem ainda não tem
          tamanho definido, ou cuja variante ainda está sem arte.
        </p>

        <div className="mt-5 max-w-md">
          <EnvioDeArte
            id="imagem-geral"
            rotulo="Imagem geral do evento"
            imagemAtual={
              evento.caminhoDaImagem && primeiroToken
                ? `/c/${primeiroToken}/imagem`
                : null
            }
            textoAlternativo={`Imagem geral do convite de ${evento.titulo}`}
            acaoSalvar={salvarImagemAction}
            acaoRemover={removerImagemAction}
            compacto
          />
        </div>
      </section>

      <section aria-labelledby="titulo-dados">
        <h2 id="titulo-dados" className="titulo-secao">
          Dados da festa
        </h2>

        <div className="painel-caixa mt-5 px-5 py-6">
          <FormularioDoEvento
            titulo={evento.titulo}
            inicio={evento.inicio ? utcParaHoraLocal(evento.inicio, evento.fuso) : ''}
            fim={evento.fim ? utcParaHoraLocal(evento.fim, evento.fuso) : ''}
            localNome={evento.localNome ?? ''}
            localEndereco={evento.localEndereco ?? ''}
            observacoes={evento.observacoes ?? ''}
            mensagemConvite={evento.mensagemConvite ?? ''}
            maxAcompanhantes={evento.maxAcompanhantes}
            dataPorExtenso={textoDaDataDoEvento(evento)}
            localCompleto={textoDoLocalDoEvento(evento)}
            exemploDeLink={exemploDeLink}
          />
        </div>
      </section>
    </div>
  );
}
