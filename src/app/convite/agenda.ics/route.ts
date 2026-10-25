import { descricaoDoEvento, localCompleto } from '@/lib/calendario';
import { gerarIcs, nomeDeArquivoIcs } from '@/lib/ics';
import { urlBase } from '@/server/ambiente';
import { buscarEvento } from '@/server/evento';

/**
 * Arquivo .ics do link unico.
 *
 * O UID e o mesmo para todo mundo, ja que o evento e um so, e o SEQUENCE
 * acompanha a ultima alteracao: se o horario mudar e a pessoa baixar de novo,
 * a agenda atualiza o compromisso que ja existe em vez de criar um segundo.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const evento = await buscarEvento();
  if (!evento.inicio) {
    return new Response('Não encontrado', { status: 404 });
  }

  const base = urlBase();
  const dominio = (() => {
    try {
      return new URL(base).hostname;
    } catch {
      return 'convite.local';
    }
  })();

  const ics = gerarIcs({
    uid: `convite@${dominio}`,
    inicio: evento.inicio,
    fim: evento.fim,
    titulo: evento.titulo,
    local: localCompleto(evento.localNome, evento.localEndereco),
    url: `${base}/convite`,
    descricao: descricaoDoEvento({
      observacoes: evento.observacoes,
      endereco: evento.localEndereco,
      linkDoConvite: `${base}/convite`,
    }),
    sequencia: Math.floor(evento.atualizadoEm.getTime() / 1000),
  });

  return new Response(ics, {
    status: 200,
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="${nomeDeArquivoIcs(evento.titulo)}"`,
      'cache-control': 'no-store, must-revalidate',
    },
  });
}
