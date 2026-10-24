import { describe, expect, it } from 'vitest';

import {
  FUSO_PADRAO,
  capitalizar,
  formatarDataExtenso,
  formatarDataHoraCurta,
  formatarDiaDaSemana,
  formatarDiaEMes,
  formatarFaixaDeHoras,
  formatarHora,
  horaLocalParaUtc,
  paraData,
  utcParaHoraLocal,
} from '@/lib/datas';

describe('horaLocalParaUtc', () => {
  it('trata o valor digitado como hora de Sao Paulo', () => {
    // Sao Paulo esta em UTC-3 desde o fim do horario de verao, em 2019.
    expect(horaLocalParaUtc('2027-03-14T15:00').toISOString()).toBe(
      '2027-03-14T18:00:00.000Z',
    );
  });

  it('aceita segundos opcionais', () => {
    expect(horaLocalParaUtc('2027-03-14T15:00:30').toISOString()).toBe(
      '2027-03-14T18:00:30.000Z',
    );
  });

  it('aceita espaco no lugar do T', () => {
    expect(horaLocalParaUtc('2027-03-14 15:00').toISOString()).toBe(
      '2027-03-14T18:00:00.000Z',
    );
  });

  it('respeita o horario de verao em datas antigas', () => {
    // Em janeiro de 2015 o Brasil ainda tinha horario de verao, UTC-2.
    expect(horaLocalParaUtc('2015-01-15T12:00').toISOString()).toBe(
      '2015-01-15T14:00:00.000Z',
    );
  });

  it('funciona para outro fuso', () => {
    expect(horaLocalParaUtc('2027-03-14T15:00', 'UTC').toISOString()).toBe(
      '2027-03-14T15:00:00.000Z',
    );
    expect(horaLocalParaUtc('2027-06-14T12:00', 'Europe/Lisbon').toISOString()).toBe(
      '2027-06-14T11:00:00.000Z',
    );
  });

  it('recusa formato invalido', () => {
    expect(() => horaLocalParaUtc('14/03/2027 15:00')).toThrow();
    expect(() => horaLocalParaUtc('2027-03-14')).toThrow();
    expect(() => horaLocalParaUtc('')).toThrow();
  });
});

describe('utcParaHoraLocal', () => {
  it('devolve o valor pronto para um input datetime-local', () => {
    expect(utcParaHoraLocal(new Date('2027-03-14T18:00:00.000Z'))).toBe(
      '2027-03-14T15:00',
    );
  });

  it('fecha a ida e volta', () => {
    const entradas = [
      '2027-03-14T15:00',
      '2027-01-01T00:00',
      '2027-12-31T23:59',
      '2015-01-15T12:00',
    ];
    for (const entrada of entradas) {
      expect(utcParaHoraLocal(horaLocalParaUtc(entrada))).toBe(entrada);
    }
  });

  it('completa com zero a esquerda', () => {
    expect(utcParaHoraLocal(new Date('2027-01-02T06:05:00.000Z'))).toBe(
      '2027-01-02T03:05',
    );
  });

  it('usa meia-noite como 00 e nunca como 24', () => {
    expect(utcParaHoraLocal(new Date('2027-03-15T03:00:00.000Z'))).toBe(
      '2027-03-15T00:00',
    );
  });
});

describe('formatacao em portugues', () => {
  const domingo = new Date('2027-03-14T18:00:00.000Z');
  const seisDaTarde = new Date('2027-03-14T21:00:00.000Z');
  const comMinutos = new Date('2027-03-14T18:30:00.000Z');

  it('escreve a data por extenso com inicial maiuscula', () => {
    expect(formatarDataExtenso(domingo)).toBe('Domingo, 14 de março de 2027');
  });

  it('escreve dia e mes', () => {
    expect(formatarDiaEMes(domingo)).toBe('14 de março');
  });

  it('escreve o dia da semana', () => {
    expect(formatarDiaDaSemana(domingo)).toBe('Domingo');
  });

  it('omite os minutos quando sao zero', () => {
    expect(formatarHora(domingo)).toBe('15h');
  });

  it('mostra os minutos quando existem', () => {
    expect(formatarHora(comMinutos)).toBe('15h30');
  });

  it('monta a faixa de horas com termino', () => {
    expect(formatarFaixaDeHoras(domingo, seisDaTarde)).toBe('das 15h às 18h');
  });

  it('monta a faixa de horas sem termino', () => {
    expect(formatarFaixaDeHoras(domingo, null)).toBe('às 15h');
  });

  it('escreve a data curta das listas do painel', () => {
    expect(formatarDataHoraCurta(comMinutos)).toBe('14/03/2027 às 15:30');
  });

  it('usa o fuso padrao de Sao Paulo', () => {
    expect(FUSO_PADRAO).toBe('America/Sao_Paulo');
  });
});

describe('capitalizar', () => {
  it('sobe a primeira letra', () => {
    expect(capitalizar('sábado')).toBe('Sábado');
  });

  it('nao mexe no resto', () => {
    expect(capitalizar('chá de BEBÊ')).toBe('Chá de BEBÊ');
  });

  it('aguenta string vazia', () => {
    expect(capitalizar('')).toBe('');
  });
});

describe('paraData', () => {
  it('converte uma data ISO do banco', () => {
    expect(paraData('2027-03-14T18:00:00.000Z')?.toISOString()).toBe(
      '2027-03-14T18:00:00.000Z',
    );
  });

  it('devolve null para vazio', () => {
    expect(paraData(null)).toBeNull();
    expect(paraData(undefined)).toBeNull();
    expect(paraData('')).toBeNull();
  });

  it('devolve null para texto que nao e data', () => {
    expect(paraData('amanhã')).toBeNull();
  });
});
