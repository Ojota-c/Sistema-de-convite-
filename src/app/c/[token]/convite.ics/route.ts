import { descricaoDoEvento, localCompleto } from '@/lib/calendario';
import { gerarIcs, nomeDeArquivoIcs } from '@/lib/ics';
import { normalizarToken } from '@/lib/token';
import { urlBase } from '@/server/ambiente';
import { buscarConvidadoPorToken } from '@/server/convidados';
import { buscarEvento } from '@/server/evento';

/**
 * Arquivo .ics do evento, por convidado.
 *
 * O caminho termina em .ics de proposito. O Safari do iPhone decide o que
 * fazer pelo tipo e pela extensao, e com os dois corretos ele abre direto a
 * tela de adicionar a agenda. O Android reconhece o text/calendar do mesmo
 * jeito.
 *
 * O UID e estavel por convidado e o SEQUENCE acompanha a ultima alteracao do
 * evento: se o organizador mudar o horario e a pessoa baixar de novo, a
 * agenda atualiza o compromisso que ja existe em vez de criar um segundo.
 */
export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, { params }: Contexto) {
  const token = normalizarToken((await params).token);
  if (!token) {
    return new Response('Não encontrado', { status: 404 });
  }

  const [convidado, evento] = await Promise.all([
    buscarConvidadoPorToken(token),
    buscarEvento(),
  ]);

  if (!convidado || !evento.inicio) {
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
    uid: `convite-${token}@${dominio}`,
    inicio: evento.inicio,
    fim: evento.fim,
    titulo: evento.titulo,
    local: localCompleto(evento.localNome, evento.localEndereco),
    url: `${base}/c/${token}`,
    descricao: descricaoDoEvento({
      observacoes: evento.observacoes,
      endereco: evento.localEndereco,
      linkDoConvite: `${base}/c/${token}`,
    }),
    sequencia: Math.floor(evento.atualizadoEm.getTime() / 1000),
  });

  return new Response(ics, {
    status: 200,
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="${nomeDeArquivoIcs(evento.titulo)}"`,
      // O horario pode mudar ate a vespera: nada de guardar em cache.
      'cache-control': 'no-store, must-revalidate',
    },
  });
}
