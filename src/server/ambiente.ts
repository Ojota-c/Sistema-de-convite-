import 'server-only';

import { z } from 'zod';

/**
 * Variaveis de ambiente, validadas uma unica vez e so quando alguem precisa.
 *
 * A validacao e preguicosa de proposito: `next build` compila as paginas sem
 * ter as chaves do Supabase a mao, e falhar ali so atrapalharia. O erro
 * aparece na primeira requisicao que realmente precisa do banco, com uma
 * mensagem que diz qual variavel esta faltando.
 */

const esquema = z.object({
  SUPABASE_URL: z.url({ error: 'SUPABASE_URL precisa ser uma URL válida.' }),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({ error: 'SUPABASE_SERVICE_ROLE_KEY não foi definida.' })
    .min(20, { error: 'SUPABASE_SERVICE_ROLE_KEY parece curta demais.' }),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('convite'),
  ADMIN_PASSWORD: z
    .string({ error: 'ADMIN_PASSWORD não foi definida.' })
    .min(8, { error: 'ADMIN_PASSWORD precisa ter ao menos 8 caracteres.' }),
  ADMIN_SESSION_SECRET: z
    .string({ error: 'ADMIN_SESSION_SECRET não foi definida.' })
    .min(32, {
      error:
        'ADMIN_SESSION_SECRET precisa ter ao menos 32 caracteres. Gere com: openssl rand -base64 48',
    }),
  NEXT_PUBLIC_SITE_URL: z.url({
    error: 'NEXT_PUBLIC_SITE_URL precisa ser uma URL válida, com https://.',
  }),
});

export type Ambiente = z.infer<typeof esquema>;

let memoria: Ambiente | null = null;

/**
 * Descobre a URL publica do site.
 * Na Vercel, VERCEL_URL ja existe no primeiro deploy, antes de alguem
 * configurar NEXT_PUBLIC_SITE_URL a mao.
 */
function urlDoSite(): string | undefined {
  const explicita = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicita) return explicita.replace(/\/+$/, '');

  const daVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (daVercel) return `https://${daVercel.replace(/\/+$/, '')}`;

  return undefined;
}

export function ambiente(): Ambiente {
  if (memoria) return memoria;

  const resultado = esquema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
    NEXT_PUBLIC_SITE_URL: urlDoSite(),
  });

  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Configuração de ambiente incompleta. Confira o arquivo .env.example.\n${problemas}`,
    );
  }

  memoria = resultado.data;
  return memoria;
}

/** URL publica do site, sem barra no fim. */
export function urlBase(): string {
  return ambiente().NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
}
