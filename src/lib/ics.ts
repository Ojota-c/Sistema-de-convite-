/**
 * Geracao de arquivo .ics conforme a RFC 5545.
 *
 * Decisoes que importam para o arquivo abrir bem no iPhone e no Android:
 *
 * - Os horarios saem em UTC, com o sufixo Z (FORM #2 da RFC). Isso dispensa
 *   um bloco VTIMEZONE inteiro e nao depende do banco de fusos do aparelho.
 * - As linhas terminam em CRLF e sao dobradas em 75 octetos, contando bytes
 *   UTF-8 e nunca partindo um caractere no meio.
 * - O UID e estavel por convidado. Baixar de novo atualiza o mesmo evento na
 *   agenda em vez de criar um segundo, desde que SEQUENCE suba.
 */

const PRODID = '-//Convite Cha de Bebe//RSVP pt-BR//PT-BR';
const LIMITE_OCTETOS = 75;

export interface EntradaIcs {
  /** Identificador estavel do evento, unico no mundo. */
  uid: string;
  inicio: Date;
  /** Quando nao houver termino, assume tres horas de duracao. */
  fim?: Date | null;
  titulo: string;
  descricao?: string | null;
  local?: string | null;
  url?: string | null;
  /** DTSTAMP. Injetavel para o teste ser deterministico. */
  carimbo?: Date;
  /** Sobe a cada alteracao do evento, para as agendas atualizarem. */
  sequencia?: number;
  /** Duracao ISO 8601 negativa. O padrao avisa um dia antes. */
  alarmeAntes?: string;
}

const TRES_HORAS_EM_MS = 3 * 60 * 60 * 1000;

/** Converte um instante em "AAAAMMDDTHHMMSSZ". */
export function formatarInstanteIcs(data: Date): string {
  if (Number.isNaN(data.getTime())) {
    throw new Error('Data invalida ao gerar o arquivo de calendario.');
  }
  const dois = (n: number) => String(n).padStart(2, '0');
  return [
    String(data.getUTCFullYear()).padStart(4, '0'),
    dois(data.getUTCMonth() + 1),
    dois(data.getUTCDate()),
    'T',
    dois(data.getUTCHours()),
    dois(data.getUTCMinutes()),
    dois(data.getUTCSeconds()),
    'Z',
  ].join('');
}

/**
 * Escapa um valor TEXT da RFC 5545.
 * Barra invertida, ponto e virgula, virgula e quebra de linha. Dois pontos
 * nao se escapa em valor, so em parametro.
 */
export function escaparTextoIcs(valor: string): string {
  return valor
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Dobra uma linha em 75 octetos UTF-8.
 * As continuacoes comecam com um espaco, que ja ocupa um dos 75 octetos.
 */
export function dobrarLinhaIcs(linha: string): string {
  const codificador = new TextEncoder();
  if (codificador.encode(linha).length <= LIMITE_OCTETOS) {
    return linha;
  }

  const pedacos: string[] = [];
  let atual = '';
  let octetos = 0;
  let limite = LIMITE_OCTETOS;

  // Itera por pontos de codigo, nunca por unidades UTF-16, para nao partir
  // um emoji ou uma letra acentuada ao meio.
  for (const caractere of linha) {
    const tamanho = codificador.encode(caractere).length;
    if (octetos + tamanho > limite) {
      pedacos.push(atual);
      atual = caractere;
      octetos = tamanho;
      limite = LIMITE_OCTETOS - 1;
    } else {
      atual += caractere;
      octetos += tamanho;
    }
  }
  pedacos.push(atual);

  return pedacos.join('\r\n ');
}

/** Monta o conteudo completo do arquivo .ics. */
export function gerarIcs(entrada: EntradaIcs): string {
  const {
    uid,
    inicio,
    titulo,
    descricao = null,
    local = null,
    url = null,
    carimbo = new Date(),
    sequencia = 0,
    alarmeAntes = '-P1D',
  } = entrada;

  if (Number.isNaN(inicio.getTime())) {
    throw new Error('O evento precisa de uma data de inicio valida.');
  }

  const fim =
    entrada.fim && !Number.isNaN(entrada.fim.getTime()) && entrada.fim > inicio
      ? entrada.fim
      : new Date(inicio.getTime() + TRES_HORAS_EM_MS);

  const linhas: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escaparTextoIcs(uid)}`,
    `DTSTAMP:${formatarInstanteIcs(carimbo)}`,
    `DTSTART:${formatarInstanteIcs(inicio)}`,
    `DTEND:${formatarInstanteIcs(fim)}`,
    `SEQUENCE:${Math.max(0, Math.trunc(sequencia))}`,
    `SUMMARY:${escaparTextoIcs(titulo)}`,
  ];

  if (descricao && descricao.trim().length > 0) {
    linhas.push(`DESCRIPTION:${escaparTextoIcs(descricao.trim())}`);
  }
  if (local && local.trim().length > 0) {
    linhas.push(`LOCATION:${escaparTextoIcs(local.trim())}`);
  }
  if (url && url.trim().length > 0) {
    linhas.push(`URL:${escaparTextoIcs(url.trim())}`);
  }

  linhas.push(
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `TRIGGER:${alarmeAntes}`,
    `DESCRIPTION:${escaparTextoIcs(`Amanhã: ${titulo}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  );

  return `${linhas.map(dobrarLinhaIcs).join('\r\n')}\r\n`;
}

/** Nome de arquivo seguro, sem acento nem caractere especial. */
export function nomeDeArquivoIcs(titulo: string): string {
  const base = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${base.length > 0 ? base : 'convite'}.ics`;
}
