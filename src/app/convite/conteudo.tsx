import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';

import { resolverArte, varianteDoLink, versaoDaArte, type ArteDoConvite } from '@/lib/arte';
import { detectarSistema } from '@/lib/bots';
import { descricaoDoEvento, linkGoogleAgenda, localCompleto } from '@/lib/calendario';
import { formatarDataExtenso, formatarFaixaDeHoras, formatarHora } from '@/lib/datas';
import { paletaParaVariaveisCss } from '@/lib/paleta';
import { codigoDeVarianteSchema } from '@/lib/validacao';
import { linkDoConviteAberto } from '@/lib/whatsapp';
import { BotoesDeCalendario } from '@/components/convidado/BotoesDeCalendario';
import { CartaoDoConvite } from '@/components/convidado/CartaoDoConvite';
import { RespostaDoConvidado } from '@/components/convidado/RespostaDoConvidado';
import type { Evento } from '@/types/dominio';
import { urlBase } from '@/server/ambiente';
import { buscarConvidadoPorToken } from '@/server/convidados';
import { buscarEvento } from '@/server/evento';
import { lerTokenDaResposta } from '@/server/resposta';
import { listarVariantes } from '@/server/variantes';

import { responderConviteAberto } from './acoes';

/**
 * Pagina do link unico, compartilhada por /convite e /convite/[tamanho].
 *
 * O link e o mesmo para todo mundo. O tamanho no caminho so escolhe a arte,
 * que aparece no topo e na previa do WhatsApp: quem envia escolhe a imagem,
 * quem recebe toca nela e cai aqui. O resto da pagina e igual.
 */

/** Codigo usado na rota da imagem quando nao ha variante nenhuma. */
const CODIGO_GERAL = 'geral';

/** Le o tamanho da URL. Formato invalido vira 404, como um tamanho que nao existe. */
export function lerCodigoDaUrl(bruto: string): string {
  const validacao = codigoDeVarianteSchema.safeParse(decodeURIComponent(bruto));
  if (!validacao.success) notFound();
  return validacao.data;
}

async function carregar(codigo: string | null): Promise<{
  evento: Evento;
  arte: ArteDoConvite;
  codigoDaArte: string;
}> {
  const [evento, variantes] = await Promise.all([buscarEvento(), listarVariantes()]);

  const variante = varianteDoLink(variantes, codigo);
  // Pediu um tamanho que nao existe: melhor 404 que um tamanho errado.
  if (codigo && !variante) notFound();

  return {
    evento,
    arte: resolverArte(evento, variante),
    codigoDaArte: variante?.codigo ?? CODIGO_GERAL,
  };
}

/** Caminho da imagem, com a versao no proprio caminho para nenhum cache servir a antiga. */
function caminhoDaImagem(codigoDaArte: string, arte: ArteDoConvite): string {
  return `/convite/${codigoDaArte.toLowerCase()}/imagem/${versaoDaArte(arte.caminho)}`;
}

/** Metadados Open Graph: e o que faz a arte aparecer na conversa do WhatsApp. */
export async function metadadosDoConvite(codigo: string | null): Promise<Metadata> {
  const { evento, arte, codigoDaArte } = await carregar(codigo);
  const base = urlBase();

  const partes: string[] = [];
  if (evento.inicio) {
    partes.push(
      `${formatarDataExtenso(evento.inicio, evento.fuso)}, às ${formatarHora(evento.inicio, evento.fuso)}`,
    );
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
      url: codigo ? linkDoConviteAberto(base, codigo) : `${base}/convite`,
      siteName: evento.titulo,
      images: arte.caminho
        ? [
            {
              url: `${base}${caminhoDaImagem(codigoDaArte, arte)}`,
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

export async function ConviteAberto({ codigo }: { codigo: string | null }) {
  const [{ evento, arte, codigoDaArte }, tokenDaResposta, cabecalhos] = await Promise.all([
    carregar(codigo),
    lerTokenDaResposta(),
    headers(),
  ]);

  // Quem ja respondeu por este celular ve a propria resposta, e pode mudar.
  const respondeu = tokenDaResposta ? await buscarConvidadoPorToken(tokenDaResposta) : null;

  const base = urlBase();
  const linkDaPagina = codigo ? linkDoConviteAberto(base, codigo) : `${base}/convite`;
  const local = localCompleto(evento.localNome, evento.localEndereco);
  const dataPorExtenso = evento.inicio ? formatarDataExtenso(evento.inicio, evento.fuso) : null;
  const faixaDeHoras = evento.inicio
    ? formatarFaixaDeHoras(evento.inicio, evento.fim, evento.fuso)
    : null;

  const painelDeCalendario =
    evento.inicio && dataPorExtenso && faixaDeHoras ? (
      <BotoesDeCalendario
        caminhoDoIcs="/convite/agenda.ics"
        linkDoGoogle={linkGoogleAgenda({
          titulo: evento.titulo,
          inicio: evento.inicio,
          fim: evento.fim,
          local,
          descricao: descricaoDoEvento({
            observacoes: evento.observacoes,
            endereco: evento.localEndereco,
            linkDoConvite: linkDaPagina,
          }),
        })}
        dataPorExtenso={dataPorExtenso}
        faixaDeHoras={faixaDeHoras}
        local={evento.localNome ?? evento.localEndereco}
        sistema={detectarSistema(cabecalhos.get('user-agent'))}
      />
    ) : null;

  const variaveisDaPaleta = paletaParaVariaveisCss(arte.paleta) as unknown as CSSProperties;

  return (
    <div style={variaveisDaPaleta} className="textura-papel min-h-dvh">
      <main className="mx-auto w-full max-w-[32rem] px-4 py-8 sm:px-6 sm:py-14">
        <div className="entrada entrada-1">
          <CartaoDoConvite
            evento={evento}
            caminhoDaImagem={arte.caminho ? caminhoDaImagem(codigoDaArte, arte) : null}
            larguraDaImagem={arte.largura}
            alturaDaImagem={arte.altura}
            sugestaoDePresente={arte.descricao}
            dataPorExtenso={dataPorExtenso}
            faixaDeHoras={faixaDeHoras}
          />
        </div>

        <div className="cartao-convite entrada entrada-3 mt-6 px-6 py-9 sm:px-10">
          <RespostaDoConvidado
            acao={responderConviteAberto}
            camposOcultos={{ codigo: codigoDaArte }}
            permitirOutraPessoa
            nomeInicial={respondeu?.nome ?? ''}
            acompanhantesIniciais={respondeu?.acompanhantes.map((a) => a.nome) ?? []}
            maxAcompanhantes={evento.maxAcompanhantes}
            statusInicial={respondeu?.status ?? 'sem-resposta'}
            coresDaCelebracao={[arte.paleta.destaque, arte.paleta.borda, arte.paleta.tintaSuave]}
            painelDeCalendario={painelDeCalendario}
          />
        </div>
      </main>
    </div>
  );
}
