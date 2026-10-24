/**
 * Datas e horarios no fuso America/Sao_Paulo.
 *
 * O banco guarda sempre timestamptz, ou seja instantes absolutos. A conversao
 * para hora de parede acontece aqui, com Intl, sem nenhuma dependencia extra.
 *
 * O Brasil nao usa mais horario de verao desde 2019, mas a conversao abaixo
 * calcula o deslocamento a partir do proprio instante em vez de fixar -03:00.
 * Assim ela continua correta para datas antigas e para qualquer outro fuso.
 */

export const FUSO_PADRAO = 'America/Sao_Paulo';

interface PartesDeData {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
}

const PADRAO_HORA_LOCAL = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Quebra um instante nos componentes de hora de parede do fuso indicado. */
function partesNoFuso(data: Date, fuso: string): PartesDeData {
  const formatador = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  let ano = 1970;
  let mes = 1;
  let dia = 1;
  let hora = 0;
  let minuto = 0;
  let segundo = 0;

  for (const parte of formatador.formatToParts(data)) {
    const numero = Number(parte.value);
    switch (parte.type) {
      case 'year':
        ano = numero;
        break;
      case 'month':
        mes = numero;
        break;
      case 'day':
        dia = numero;
        break;
      case 'hour':
        hora = numero;
        break;
      case 'minute':
        minuto = numero;
        break;
      case 'second':
        segundo = numero;
        break;
      default:
        break;
    }
  }

  return { ano, mes, dia, hora, minuto, segundo };
}

/** Deslocamento do fuso, em milissegundos, no instante informado. */
function deslocamentoMs(data: Date, fuso: string): number {
  const partes = partesNoFuso(data, fuso);
  const comoSeFosseUtc = Date.UTC(
    partes.ano,
    partes.mes - 1,
    partes.dia,
    partes.hora,
    partes.minuto,
    partes.segundo,
  );
  const semMilissegundos = Math.floor(data.getTime() / 1000) * 1000;
  return comoSeFosseUtc - semMilissegundos;
}

/**
 * Converte o valor de um input datetime-local, que e hora de parede do fuso
 * do evento, no instante absoluto correspondente.
 *
 * O organizador pode estar em outro fuso: o que ele digita significa sempre
 * "este horario em Sao Paulo".
 */
export function horaLocalParaUtc(local: string, fuso: string = FUSO_PADRAO): Date {
  const achado = PADRAO_HORA_LOCAL.exec(local.trim());
  if (!achado) {
    throw new Error(`Data e hora local invalida: "${local}".`);
  }

  const [, ano, mes, dia, hora, minuto, segundo] = achado;
  const ingenua = Date.UTC(
    Number(ano ?? '1970'),
    Number(mes ?? '1') - 1,
    Number(dia ?? '1'),
    Number(hora ?? '0'),
    Number(minuto ?? '0'),
    Number(segundo ?? '0'),
  );

  // Primeira aproximacao com o deslocamento do proprio instante ingenuo,
  // depois uma correcao, que so muda alguma coisa perto de uma virada de
  // horario de verao.
  const primeira = ingenua - deslocamentoMs(new Date(ingenua), fuso);
  const segunda = ingenua - deslocamentoMs(new Date(primeira), fuso);
  return new Date(segunda);
}

/** Converte um instante no valor de um input datetime-local do fuso do evento. */
export function utcParaHoraLocal(data: Date, fuso: string = FUSO_PADRAO): string {
  const p = partesNoFuso(data, fuso);
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${String(p.ano).padStart(4, '0')}-${dois(p.mes)}-${dois(p.dia)}T${dois(p.hora)}:${dois(p.minuto)}`;
}

/** Deixa a primeira letra maiuscula, respeitando acentos. */
export function capitalizar(texto: string): string {
  if (texto.length === 0) return texto;
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1);
}

/** "Sábado, 14 de março de 2027". */
export function formatarDataExtenso(data: Date, fuso: string = FUSO_PADRAO): string {
  const texto = new Intl.DateTimeFormat('pt-BR', {
    timeZone: fuso,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(data);
  return capitalizar(texto);
}

/** "14 de março". */
export function formatarDiaEMes(data: Date, fuso: string = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: fuso,
    day: 'numeric',
    month: 'long',
  }).format(data);
}

/** "Sábado". */
export function formatarDiaDaSemana(data: Date, fuso: string = FUSO_PADRAO): string {
  return capitalizar(
    new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, weekday: 'long' }).format(data),
  );
}

/** "15h" quando o minuto e zero, "15h30" caso contrario. */
export function formatarHora(data: Date, fuso: string = FUSO_PADRAO): string {
  const { hora, minuto } = partesNoFuso(data, fuso);
  return minuto === 0 ? `${hora}h` : `${hora}h${String(minuto).padStart(2, '0')}`;
}

/** "às 15h" ou "das 15h às 18h", conforme exista horario de termino. */
export function formatarFaixaDeHoras(
  inicio: Date,
  fim: Date | null,
  fuso: string = FUSO_PADRAO,
): string {
  const comeco = formatarHora(inicio, fuso);
  if (!fim) return `às ${comeco}`;
  return `das ${comeco} às ${formatarHora(fim, fuso)}`;
}

/** "14/03/2027 às 15:32", usado nas listas do painel. */
export function formatarDataHoraCurta(data: Date, fuso: string = FUSO_PADRAO): string {
  const p = partesNoFuso(data, fuso);
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${dois(p.dia)}/${dois(p.mes)}/${p.ano} às ${dois(p.hora)}:${dois(p.minuto)}`;
}

/** Converte com seguranca um valor vindo do banco em Date. */
export function paraData(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}
