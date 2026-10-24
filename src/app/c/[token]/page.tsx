import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';

import { acharVariante, resolverArte } from '@/lib/arte';
import { detectarSistema } from '@/lib/bots';
import { descricaoDoEvento, linkGoogleAgenda, localCompleto } from '@/lib/calendario';
import {
  formatarDataExtenso,
  formatarFaixaDeHoras,
  formatarHora,
} from '@/lib/datas';
import { paletaParaVariaveisCss } from '@/lib/paleta';
import { normalizarToken } from '@/lib/token';
import { BotoesDeCalendario } from '@/components/convidado/BotoesDeCalendario';
import { CartaoDoConvite } from '@/components/convidado/CartaoDoConvite';
import { RegistroDeAbertura } from '@/components/convidado/RegistroDeAbertura';
import { RespostaDoConvidado } from '@/components/convidado/RespostaDoConvidado';
import { urlBase } from '@/server/ambiente';
import { buscarConvidadoPorToken } from '@/server/convidados';
import { buscarEvento } from '@/server/evento';
import { listarVariantes } from '@/server/variantes';

/**
 * A pagina do convidado.
 *
 * Renderizada a cada requisicao: o convidado precisa ver o estado atual da
 * propria resposta, e nada aqui pode ser servido de um cache compartilhado.
 *
 * Esta pagina NAO registra a abertura. Quem faz isso e o componente
 * RegistroDeAbertura, ja no navegador, justamente para que as visitas
 * automaticas do WhatsApp em busca da previa nao contem como abertura.
 */
export const dynamic = 'force-dynamic';

interface PropsDaPagina {
  params: Promise<{ token: string }>;
}

/** Metadados Open Graph, para a previa do link no WhatsApp mostrar o convite. */
export async function generateMetadata({ params }: PropsDaPagina): Promise<Metadata> {
  const token = normalizarToken((await params).token);
  if (!token) {
    return { title: 'Convite não encontrado', robots: { index: false, follow: false } };
  }

  const [convidado, evento, variantes] = await Promise.all([
    buscarConvidadoPorToken(token),
    buscarEvento(),
    listarVariantes(),
  ]);

  if (!convidado) {
    return { title: 'Convite não encontrado', robots: { index: false, follow: false } };
  }

  const arte = resolverArte(evento, acharVariante(variantes, convidado.variante));

  const base = urlBase();
  const partes: string[] = [];
  if (evento.inicio) {
    partes.push(`${formatarDataExtenso(evento.inicio, evento.fuso)}, às ${formatarHora(evento.inicio, evento.fuso)}`);
  }
  const local = localCompleto(evento.localNome, evento.localEndereco);
  if (local) partes.push(local);

  const descricao =
    partes.length > 0 ? partes.join(' · ') : 'Toque para ver o convite e confirmar sua presença.';

  return {
    title: evento.titulo,
    description: descricao,
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      title: evento.titulo,
      description: descricao,
      url: `${base}/c/${token}`,
      siteName: evento.titulo,
      images: arte.caminho
        ? [
            {
              url: `${base}/c/${token}/imagem`,
              width: arte.largura ?? 1200,
              height: arte.altura ?? 630,
              alt: `Convite do evento ${evento.titulo}`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: arte.caminho ? 'summary_large_image' : 'summary',
      title: evento.titulo,
      description: descricao,
    },
  };
}

export default async function PaginaDoConvite({ params }: PropsDaPagina) {
  const token = normalizarToken((await params).token);
  if (!token) notFound();

  const [convidado, evento, variantes, cabecalhos] = await Promise.all([
    buscarConvidadoPorToken(token),
    buscarEvento(),
    listarVariantes(),
    headers(),
  ]);

  if (!convidado) notFound();

  // A arte vem da variante do convidado. Sem variante definida, ou sem arte
  // enviada ainda, cai na imagem geral do evento.
  const arte = resolverArte(evento, acharVariante(variantes, convidado.variante));

  const base = urlBase();
  const local = localCompleto(evento.localNome, evento.localEndereco);
  const dataPorExtenso = evento.inicio
    ? formatarDataExtenso(evento.inicio, evento.fuso)
    : null;
  const faixaDeHoras = evento.inicio
    ? formatarFaixaDeHoras(evento.inicio, evento.fim, evento.fuso)
    : null;

  const painelDeCalendario =
    evento.inicio && dataPorExtenso && faixaDeHoras ? (
      <BotoesDeCalendario
        caminhoDoIcs={`/c/${token}/convite.ics`}
        linkDoGoogle={linkGoogleAgenda({
          titulo: evento.titulo,
          inicio: evento.inicio,
          fim: evento.fim,
          local,
          descricao: descricaoDoEvento({
            observacoes: evento.observacoes,
            endereco: evento.localEndereco,
            linkDoConvite: `${base}/c/${token}`,
          }),
        })}
        dataPorExtenso={dataPorExtenso}
        faixaDeHoras={faixaDeHoras}
        local={evento.localNome ?? evento.localEndereco}
        sistema={detectarSistema(cabecalhos.get('user-agent'))}
      />
    ) : null;

  const variaveisDaPaleta = paletaParaVariaveisCss(
    arte.paleta,
  ) as unknown as CSSProperties;

  const coresDaCelebracao = [
    arte.paleta.destaque,
    arte.paleta.borda,
    arte.paleta.tintaSuave,
  ];

  return (
    <div style={variaveisDaPaleta} className="textura-papel min-h-dvh">
      <RegistroDeAbertura token={token} />

      <main className="mx-auto w-full max-w-[32rem] px-4 py-8 sm:px-6 sm:py-14">
        <div className="entrada entrada-1">
          <CartaoDoConvite
            evento={evento}
            caminhoDaImagem={arte.caminho ? `/c/${token}/imagem` : null}
            larguraDaImagem={arte.largura}
            alturaDaImagem={arte.altura}
            sugestaoDePresente={arte.descricao}
            dataPorExtenso={dataPorExtenso}
            faixaDeHoras={faixaDeHoras}
          />
        </div>

        <div className="cartao-convite entrada entrada-3 mt-6 px-6 py-9 sm:px-10">
          <RespostaDoConvidado
            token={token}
            nomeInicial={convidado.nome}
            acompanhantesIniciais={convidado.acompanhantes.map((a) => a.nome)}
            maxAcompanhantes={evento.maxAcompanhantes}
            statusInicial={convidado.status}
            coresDaCelebracao={coresDaCelebracao}
            painelDeCalendario={painelDeCalendario}
          />
        </div>

        <p className="mt-8 text-center text-xs text-[var(--cor-tinta-suave)]">
          Este convite é só seu.
        </p>
      </main>
    </div>
  );
}
