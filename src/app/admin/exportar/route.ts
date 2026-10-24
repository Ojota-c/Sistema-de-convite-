import { gerarCsv, nomeDoArquivoCsv } from '@/lib/painel';
import { urlBase } from '@/server/ambiente';
import { listarConvidados } from '@/server/convidados';
import { buscarEvento } from '@/server/evento';
import { sessaoAtiva } from '@/server/sessao';

/**
 * Exportacao da lista em CSV.
 *
 * Route Handler, e nao Server Action, porque o navegador precisa de uma
 * resposta com Content-Disposition para abrir a caixa de salvar arquivo.
 *
 * A sessao e conferida aqui dentro: uma rota de API nunca depende so do
 * redirecionamento do proxy.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await sessaoAtiva())) {
    return new Response('Não autorizado', { status: 401 });
  }

  const [convidados, evento] = await Promise.all([listarConvidados(), buscarEvento()]);

  const csv = gerarCsv(convidados, { fuso: evento.fuso, urlBase: urlBase() });

  return new Response(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${nomeDoArquivoCsv()}"`,
      'cache-control': 'no-store',
    },
  });
}
