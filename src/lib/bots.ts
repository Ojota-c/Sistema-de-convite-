/**
 * Deteccao de robos e geradores de previa.
 *
 * O WhatsApp, o Telegram, o Slack e os buscadores abrem o link sozinhos para
 * montar a previa. Nenhuma dessas visitas pode contar como "o convidado abriu
 * o convite".
 *
 * A defesa principal e outra: a abertura so e registrada por uma chamada que
 * parte do navegador depois que a pagina monta, e nenhum desses robos executa
 * JavaScript. O filtro de user agent abaixo e a segunda camada.
 */
const PADRAO_ROBO = new RegExp(
  [
    'bot',
    'crawl',
    'spider',
    'slurp',
    'facebookexternalhit',
    'facebookcatalog',
    'whatsapp',
    'telegram',
    'discord',
    'slack',
    'twitterbot',
    'linkedinbot',
    'pinterest',
    'skypeuripreview',
    'redditbot',
    'applebot',
    'googlebot',
    'bingbot',
    'yandex',
    'duckduck',
    'baiduspider',
    'embedly',
    'quora link preview',
    'outbrain',
    'vkshare',
    'preview',
    'scraper',
    'fetcher',
    'monitor',
    'pingdom',
    'uptime',
    'lighthouse',
    'headless',
    'phantomjs',
    'curl',
    'wget',
    'python-requests',
    'go-http-client',
    'axios',
    'okhttp',
    'java/',
    'libwww-perl',
  ].join('|'),
  'i',
);

/** Responde se o user agent parece de robo, previa de link ou monitoramento. */
export function pareceRobo(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // sem user agent, tratamos como robo
  return PADRAO_ROBO.test(userAgent);
}

/** Responde se o user agent parece um navegador de verdade. */
export function pareceNavegador(userAgent: string | null | undefined): boolean {
  return !pareceRobo(userAgent);
}

/** Sistema provavel de quem abriu, para destacar o botao de calendario certo. */
export type SistemaProvavel = 'apple' | 'android' | 'desconhecido';

export function detectarSistema(userAgent: string | null | undefined): SistemaProvavel {
  if (!userAgent) return 'desconhecido';
  const ua = userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod|macintosh|mac os x/.test(ua)) return 'apple';
  return 'desconhecido';
}
