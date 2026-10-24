import { pareceRobo } from '@/lib/bots';
import { normalizarToken } from '@/lib/token';
import { registrarAbertura } from '@/server/convidados';
import {
  LIMITE_ABERTURA,
  chaveDeLimite,
  dentroDoLimite,
  enderecoDoCliente,
} from '@/server/limite';

/**
 * Registro de abertura do convite.
 *
 * So e chamada pelo componente RegistroDeAbertura, de dentro do navegador,
 * depois que a pagina monta. Nenhuma renderizacao no servidor passa por aqui.
 *
 * Tres camadas impedem que uma previa de link conte como abertura:
 *
 *   1. a chamada e client-side, e robo de previa nao executa JavaScript;
 *   2. o metodo e POST, e os robos so fazem GET;
 *   3. o user agent e conferido, e os de robo conhecido sao ignorados.
 *
 * O cabecalho sec-fetch-site barra ainda uma chamada disparada de outro site.
 */
export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ token: string }>;
}

export async function POST(request: Request, { params }: Contexto) {
  const token = normalizarToken((await params).token);
  if (!token) {
    return Response.json({ ok: false }, { status: 404 });
  }

  // Um site qualquer nao pode ficar inflando a contagem de aberturas alheia.
  const origem = request.headers.get('sec-fetch-site');
  if (origem && origem !== 'same-origin' && origem !== 'none') {
    return Response.json({ ok: false, motivo: 'origem' }, { status: 403 });
  }

  // Robo reconhecido recebe sucesso, mas nada e gravado: avisar que ele foi
  // identificado so ajudaria quem quisesse contornar o filtro.
  if (pareceRobo(request.headers.get('user-agent'))) {
    return Response.json({ ok: true });
  }

  const endereco = await enderecoDoCliente();
  const liberado = await dentroDoLimite(
    chaveDeLimite('abertura', `${endereco}:${token}`),
    LIMITE_ABERTURA,
  );
  if (!liberado) {
    return Response.json({ ok: false, motivo: 'limite' }, { status: 429 });
  }

  const registrou = await registrarAbertura(token);

  return Response.json(
    { ok: registrou },
    { status: registrou ? 200 : 404, headers: { 'cache-control': 'no-store' } },
  );
}
