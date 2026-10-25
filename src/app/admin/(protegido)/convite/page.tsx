import {
  removerArteDaVarianteAction,
  salvarArteDaVarianteAction,
} from '@/app/admin/acoes';
import { EnviarArte } from '@/components/admin/EnviarArte';
import { EnvioDeArte } from '@/components/admin/EnvioDeArte';
import { FormularioDoEvento } from '@/components/admin/FormularioDoEvento';
import { versaoDaArte } from '@/lib/arte';
import { utcParaHoraLocal } from '@/lib/datas';
import { mensagemDoLinkUnico, textoDaDataDoEvento, textoDoLocalDoEvento } from '@/lib/visao';
import { linkDoConviteAberto, linkWhatsApp } from '@/lib/whatsapp';
import { urlBase } from '@/server/ambiente';
import { buscarEvento } from '@/server/evento';
import { exigirAdmin } from '@/server/sessao';
import { listarVariantes } from '@/server/variantes';
import type { Variante } from '@/types/dominio';

export const dynamic = 'force-dynamic';

/** Rota do painel que serve a arte, com a versao para nunca mostrar a antiga. */
function urlDaArte(variante: Variante): string | null {
  return variante.temImagem
    ? `/admin/arte/${variante.codigo}?v=${versaoDaArte(variante.caminhoDaImagem)}`
    : null;
}

/**
 * O convite: as tres artes, cada uma com o botao de enviar embaixo, e os
 * dados da festa.
 *
 * Quem envia escolhe a arte do tamanho de fralda e manda pelo WhatsApp. Quem
 * recebe toca na imagem da previa, preenche o nome e os acompanhantes, e a
 * resposta cai sozinha na aba Convidados.
 */
export default async function PaginaDoConvite() {
  await exigirAdmin();

  const [evento, variantes] = await Promise.all([buscarEvento(), listarVariantes()]);
  const base = urlBase();
  const exemploDeLink = linkDoConviteAberto(base, variantes[0]?.codigo ?? 'm');

  return (
    <div className="space-y-12">
      <section aria-labelledby="titulo-artes">
        <h1 id="titulo-artes" className="titulo-secao">
          As artes do convite
        </h1>
        <p className="mt-2 text-sm text-[var(--cor-tinta-suave)]">
          Aperte <strong>Enviar no WhatsApp</strong> embaixo da arte do tamanho
          de fralda que você quer mandar e escolha a pessoa. A arte aparece na
          conversa; quem recebe toca nela, preenche o nome e o dos
          acompanhantes, e a resposta chega sozinha na aba Convidados.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {variantes.map((variante) => {
            const link = linkDoConviteAberto(base, variante.codigo);
            const mensagem = mensagemDoLinkUnico(evento, link);

            return (
              <EnvioDeArte
                key={variante.codigo}
                id={`variante-${variante.codigo}`}
                rotulo={variante.descricao}
                imagemAtual={urlDaArte(variante)}
                temArte={variante.temImagem}
                textoAlternativo={`Arte do convite: ${variante.descricao}`}
                acaoSalvar={salvarArteDaVarianteAction}
                acaoRemover={removerArteDaVarianteAction}
                camposExtras={{ codigo: variante.codigo }}
                envio={<EnviarArte link={link} linkWhatsApp={linkWhatsApp(null, mensagem)} />}
              />
            );
          })}
        </div>

        {variantes.length === 0 ? (
          <p className="painel-caixa mt-5 px-6 py-8 text-center text-sm text-[var(--cor-tinta-suave)]">
            Nenhuma arte cadastrada. Rode a migration 0004_variantes.sql no SQL
            Editor do Supabase para criar as três.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="titulo-dados">
        <h2 id="titulo-dados" className="titulo-secao">
          Dados da festa e mensagem do WhatsApp
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
