import {
  removerArteDaVarianteAction,
  removerImagemAction,
  salvarArteDaVarianteAction,
  salvarImagemAction,
} from '@/app/admin/acoes';
import { EnvioDeArte } from '@/components/admin/EnvioDeArte';
import { FormularioDoEvento } from '@/components/admin/FormularioDoEvento';
import { PosicaoDoLink } from '@/components/admin/PosicaoDoLink';
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
          {variantes.map((variante) => (
            <EnvioDeArte
              key={variante.codigo}
              id={`variante-${variante.codigo}`}
              rotulo={variante.descricao}
              ajuda={`Código ${variante.codigo}`}
              imagemAtual={
                variante.temImagem ? `/admin/arte/${variante.codigo}` : null
              }
              temArte={variante.temImagem}
              textoAlternativo={`Arte do convite para ${variante.descricao}`}
              acaoSalvar={salvarArteDaVarianteAction}
              acaoRemover={removerArteDaVarianteAction}
              camposExtras={{ codigo: variante.codigo }}
              compacto
            />
          ))}
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
            imagemAtual={evento.caminhoDaImagem ? '/admin/arte/evento' : null}
            temArte={Boolean(evento.caminhoDaImagem)}
            textoAlternativo={`Imagem geral do convite de ${evento.titulo}`}
            acaoSalvar={salvarImagemAction}
            acaoRemover={removerImagemAction}
            compacto
          />
        </div>
      </section>

      <section aria-labelledby="titulo-posicao">
        <h2 id="titulo-posicao" className="titulo-secao">
          Endereço escrito na arte
        </h2>
        <p className="mt-2 text-sm text-[var(--cor-tinta-suave)]">
          Na aba Convidados, o botão <strong>Baixar convite</strong> gera uma
          cópia da arte com o endereço da pessoa escrito no campo em branco.
          Serve para mandar a foto junto com a mensagem, ou para imprimir. O
          endereço escrito na imagem não é clicável; quem toca para abrir a
          página usa o link da mensagem.
        </p>

        <div className="mt-5">
          <PosicaoDoLink
            linha={evento.linhaDoLink}
            urlDaArte={
              variantes.find((v) => v.temImagem)
                ? `/admin/arte/${variantes.find((v) => v.temImagem)!.codigo}`
                : evento.caminhoDaImagem
                  ? '/admin/arte/evento'
                  : null
            }
            linkDeExemplo={exemploDeLink}
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
