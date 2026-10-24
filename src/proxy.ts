import { NextResponse, type NextRequest } from 'next/server';

import { NOME_DO_COOKIE_DE_SESSAO, ROTA_DE_LOGIN } from '@/lib/constantes';

/**
 * Proxy de rede (no Next 16 este arquivo substitui o antigo middleware.ts).
 *
 * Aqui so acontece o redirecionamento: quem chega em /admin sem cookie de
 * sessao vai para a tela de login em vez de ver uma pagina quebrada.
 *
 * Isto NAO e a protecao do painel. A verificacao de verdade, que confere a
 * assinatura HMAC e a validade do cookie, acontece em exigirAdmin(), chamada
 * no topo de cada pagina e de cada action administrativa. Quem forjar um
 * cookie qualquer passa por aqui e esbarra la.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === ROTA_DE_LOGIN) {
    return NextResponse.next();
  }

  const temCookie = Boolean(request.cookies.get(NOME_DO_COOKIE_DE_SESSAO)?.value);
  if (temCookie) {
    return NextResponse.next();
  }

  const destino = request.nextUrl.clone();
  destino.pathname = ROTA_DE_LOGIN;
  destino.search = '';
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
