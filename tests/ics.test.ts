import { describe, expect, it } from 'vitest';

import {
  dobrarLinhaIcs,
  escaparTextoIcs,
  formatarInstanteIcs,
  gerarIcs,
  nomeDeArquivoIcs,
} from '@/lib/ics';

const INICIO = new Date('2027-03-14T18:00:00.000Z');
const FIM = new Date('2027-03-14T21:00:00.000Z');
const CARIMBO = new Date('2027-01-05T09:30:00.000Z');

function linhasDesdobradas(ics: string): string[] {
  // Desfaz a dobra para inspecionar o conteudo logico de cada propriedade.
  return ics.replace(/\r\n /g, '').split('\r\n').filter(Boolean);
}

function octetos(texto: string): number {
  return new TextEncoder().encode(texto).length;
}

describe('formatarInstanteIcs', () => {
  it('escreve o instante em UTC no formato da RFC 5545', () => {
    expect(formatarInstanteIcs(INICIO)).toBe('20270314T180000Z');
  });

  it('completa com zero a esquerda nos componentes de um digito', () => {
    expect(formatarInstanteIcs(new Date('2027-01-02T03:04:05.000Z'))).toBe(
      '20270102T030405Z',
    );
  });

  it('recusa uma data invalida', () => {
    expect(() => formatarInstanteIcs(new Date('nao e data'))).toThrow();
  });
});

describe('escaparTextoIcs', () => {
  it('escapa barra invertida, ponto e virgula e virgula', () => {
    expect(escaparTextoIcs('a\\b;c,d')).toBe('a\\\\b\\;c\\,d');
  });

  it('transforma quebra de linha em barra n', () => {
    expect(escaparTextoIcs('linha 1\nlinha 2')).toBe('linha 1\\nlinha 2');
    expect(escaparTextoIcs('linha 1\r\nlinha 2')).toBe('linha 1\\nlinha 2');
  });

  it('nao escapa dois pontos, que so precisa de escape em parametro', () => {
    expect(escaparTextoIcs('horario: 15h')).toBe('horario: 15h');
  });

  it('escapa a barra antes de tudo, sem escapar duas vezes', () => {
    expect(escaparTextoIcs('100% \\, ok')).toBe('100% \\\\\\, ok');
  });
});

describe('dobrarLinhaIcs', () => {
  it('deixa a linha curta intacta', () => {
    expect(dobrarLinhaIcs('SUMMARY:Cha de bebe')).toBe('SUMMARY:Cha de bebe');
  });

  it('dobra em 75 octetos e inicia a continuacao com um espaco', () => {
    const linha = `DESCRIPTION:${'a'.repeat(200)}`;
    const dobrada = dobrarLinhaIcs(linha);
    const pedacos = dobrada.split('\r\n');

    expect(pedacos.length).toBeGreaterThan(1);
    expect(octetos(pedacos[0] ?? '')).toBeLessThanOrEqual(75);
    for (const pedaco of pedacos.slice(1)) {
      expect(pedaco.startsWith(' ')).toBe(true);
      expect(octetos(pedaco)).toBeLessThanOrEqual(75);
    }
    expect(dobrada.replace(/\r\n /g, '')).toBe(linha);
  });

  it('conta octetos e nao caracteres, sem partir letra acentuada', () => {
    const linha = `SUMMARY:${'ãé'.repeat(60)}`;
    const dobrada = dobrarLinhaIcs(linha);

    for (const pedaco of dobrada.split('\r\n')) {
      expect(octetos(pedaco)).toBeLessThanOrEqual(75);
    }
    // Reconstruir devolve exatamente o texto original, sem caractere perdido.
    expect(dobrada.replace(/\r\n /g, '')).toBe(linha);
  });

  it('nao parte um emoji ao meio', () => {
    const linha = `SUMMARY:${'\u{1F37C}'.repeat(40)}`;
    const dobrada = dobrarLinhaIcs(linha);

    expect(dobrada.replace(/\r\n /g, '')).toBe(linha);
    expect(dobrada).not.toContain('�');
  });
});

describe('gerarIcs', () => {
  const base = {
    uid: 'convite-abc123@exemplo.com',
    inicio: INICIO,
    fim: FIM,
    titulo: 'Chá de Bebê do Antônio',
    descricao: 'Traga só a sua alegria.',
    local: 'Casa da Vó - Rua das Acácias, 221',
    url: 'https://exemplo.com/c/abc123',
    carimbo: CARIMBO,
  };

  it('monta a estrutura minima de um VCALENDAR', () => {
    const linhas = linhasDesdobradas(gerarIcs(base));

    expect(linhas[0]).toBe('BEGIN:VCALENDAR');
    expect(linhas.at(-1)).toBe('END:VCALENDAR');
    expect(linhas).toContain('VERSION:2.0');
    expect(linhas).toContain('CALSCALE:GREGORIAN');
    expect(linhas).toContain('BEGIN:VEVENT');
    expect(linhas).toContain('END:VEVENT');
    expect(linhas.some((l) => l.startsWith('PRODID:'))).toBe(true);
  });

  it('usa CRLF e termina o arquivo com CRLF', () => {
    const ics = gerarIcs(base);
    expect(ics.endsWith('\r\n')).toBe(true);
    // Nenhum \n solto fora de um \r\n.
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it('grava inicio, fim e carimbo em UTC', () => {
    const linhas = linhasDesdobradas(gerarIcs(base));
    expect(linhas).toContain('DTSTART:20270314T180000Z');
    expect(linhas).toContain('DTEND:20270314T210000Z');
    expect(linhas).toContain('DTSTAMP:20270105T093000Z');
  });

  it('inclui um alarme de um dia antes', () => {
    const linhas = linhasDesdobradas(gerarIcs(base));
    const inicioAlarme = linhas.indexOf('BEGIN:VALARM');

    expect(inicioAlarme).toBeGreaterThan(-1);
    expect(linhas).toContain('TRIGGER:-P1D');
    expect(linhas).toContain('ACTION:DISPLAY');
    expect(linhas).toContain('END:VALARM');
    // ACTION e TRIGGER precisam estar dentro do bloco do alarme.
    expect(linhas.indexOf('END:VALARM')).toBeGreaterThan(inicioAlarme);
  });

  it('aceita outro intervalo de alarme', () => {
    const linhas = linhasDesdobradas(gerarIcs({ ...base, alarmeAntes: '-PT2H' }));
    expect(linhas).toContain('TRIGGER:-PT2H');
  });

  it('assume tres horas de duracao quando nao ha termino', () => {
    const linhas = linhasDesdobradas(gerarIcs({ ...base, fim: null }));
    expect(linhas).toContain('DTEND:20270314T210000Z');
  });

  it('ignora um termino anterior ao inicio', () => {
    const linhas = linhasDesdobradas(
      gerarIcs({ ...base, fim: new Date('2027-03-14T10:00:00.000Z') }),
    );
    expect(linhas).toContain('DTEND:20270314T210000Z');
  });

  it('escapa virgula e ponto e virgula do local', () => {
    const linhas = linhasDesdobradas(
      gerarIcs({ ...base, local: 'Rua A, 10; sala 2' }),
    );
    expect(linhas).toContain('LOCATION:Rua A\\, 10\\; sala 2');
  });

  it('omite os campos opcionais vazios', () => {
    const ics = gerarIcs({
      ...base,
      descricao: '   ',
      local: null,
      url: null,
    });
    expect(ics).not.toContain('DESCRIPTION:\r\n');
    expect(ics).not.toContain('LOCATION:');
    expect(ics).not.toContain('URL:');
  });

  it('mantem todas as linhas dentro de 75 octetos', () => {
    const ics = gerarIcs({
      ...base,
      descricao: 'Uma descrição bem longa, com acentuação, vírgulas e um endereço completo que certamente ultrapassa o limite de setenta e cinco octetos exigido pela especificação.',
    });

    for (const linha of ics.split('\r\n')) {
      expect(octetos(linha)).toBeLessThanOrEqual(75);
    }
  });

  it('mantem o UID estavel para o mesmo convidado', () => {
    const a = gerarIcs(base);
    const b = gerarIcs({ ...base, sequencia: 7 });

    expect(linhasDesdobradas(a)).toContain('UID:convite-abc123@exemplo.com');
    expect(linhasDesdobradas(b)).toContain('UID:convite-abc123@exemplo.com');
    expect(linhasDesdobradas(b)).toContain('SEQUENCE:7');
  });

  it('recusa um inicio invalido', () => {
    expect(() => gerarIcs({ ...base, inicio: new Date('nao e data') })).toThrow();
  });
});

describe('nomeDeArquivoIcs', () => {
  it('tira acento e troca espaco por hifen', () => {
    expect(nomeDeArquivoIcs('Chá de Bebê do Antônio')).toBe(
      'cha-de-bebe-do-antonio.ics',
    );
  });

  it('cai em um nome padrao quando nada sobra', () => {
    expect(nomeDeArquivoIcs('!!!')).toBe('convite.ics');
  });
});
