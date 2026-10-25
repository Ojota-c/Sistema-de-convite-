import type { NextConfig } from 'next';

/**
 * Cabecalhos de seguranca aplicados a todas as rotas.
 * Nao usamos CSP rigida com nonce porque o Next injeta estilos inline;
 * os cabecalhos abaixo cobrem os riscos relevantes para este projeto.
 */
const cabecalhosDeSeguranca = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // O padrao e 1 MB. A arte costuma chegar bem menor, ja comprimida no
      // navegador, mas uma arte grande que nao encolhesse o bastante era
      // recusada antes de chegar a action, sem mensagem nenhuma na tela.
      // Folga acima dos 5 MB que o servidor aceita, para o envelope do form.
      bodySizeLimit: '6mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: cabecalhosDeSeguranca,
      },
    ];
  },
};

export default nextConfig;
