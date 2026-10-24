import { describe, expect, it } from 'vitest';

import {
  LINHA_PADRAO,
  dePorcentagem,
  emPixels,
  encurtarParaExibicao,
  lerLinhaDoLink,
  paraPorcentagem,
  tamanhoDaFonte,
} from '@/lib/linha-do-link';

describe('LINHA_PADRAO', () => {
  it('é a medição da arte do Chá da Flora', () => {
    // O filete fica a 83,5% da altura, de 25,3% a 81,8% da largura, numa
    // arte de 1058 por 1600.
    expect(LINHA_PADRAO.y).toBeCloseTo(0.835, 3);
    expect(LINHA_PADRAO.inicio).toBeCloseTo(0.253, 3);
    expect(LINHA_PADRAO.fim).toBeCloseTo(0.818, 3);
  });

  it('fica na parte de baixo e tem largura útil', () => {
    expect(LINHA_PADRAO.y).toBeGreaterThan(0.6);
    expect(LINHA_PADRAO.fim - LINHA_PADRAO.inicio).toBeGreaterThan(0.3);
  });
});

describe('lerLinhaDoLink', () => {
  it('aceita uma posição completa', () => {
    const guardada = { y: 0.7, inicio: 0.2, fim: 0.9 };
    expect(lerLinhaDoLink(guardada)).toEqual(guardada);
  });

  it('cai no padrão para valor que não é objeto', () => {
    for (const ruim of [null, undefined, 'x', 42, []]) {
      expect(lerLinhaDoLink(ruim)).toEqual(LINHA_PADRAO);
    }
  });

  it('cai no padrão quando falta algum campo', () => {
    expect(lerLinhaDoLink({ y: 0.7, inicio: 0.2 })).toEqual(LINHA_PADRAO);
  });

  it('cai no padrão para valor fora de zero e um', () => {
    expect(lerLinhaDoLink({ y: 1.4, inicio: 0.2, fim: 0.9 })).toEqual(LINHA_PADRAO);
    expect(lerLinhaDoLink({ y: 0.7, inicio: -0.1, fim: 0.9 })).toEqual(LINHA_PADRAO);
  });

  it('cai no padrão para valor que não é número', () => {
    expect(lerLinhaDoLink({ y: '0.7', inicio: 0.2, fim: 0.9 })).toEqual(LINHA_PADRAO);
    expect(lerLinhaDoLink({ y: NaN, inicio: 0.2, fim: 0.9 })).toEqual(LINHA_PADRAO);
  });

  it('cai no padrão quando o fim não passa do início', () => {
    expect(lerLinhaDoLink({ y: 0.7, inicio: 0.9, fim: 0.2 })).toEqual(LINHA_PADRAO);
  });

  it('cai no padrão quando a faixa é estreita demais para caber texto', () => {
    expect(lerLinhaDoLink({ y: 0.7, inicio: 0.5, fim: 0.54 })).toEqual(LINHA_PADRAO);
  });
});

describe('emPixels', () => {
  it('converte as frações em pixels da arte', () => {
    const p = emPixels({ y: 0.5, inicio: 0.25, fim: 0.75 }, 1000, 2000);
    expect(p.y).toBe(1000);
    expect(p.x1).toBe(250);
    expect(p.x2).toBe(750);
    expect(p.centro).toBe(500);
  });

  it('deixa uma folga para o texto não encostar nas pontas', () => {
    const p = emPixels({ y: 0.5, inicio: 0.25, fim: 0.75 }, 1000, 2000);
    expect(p.disponivel).toBeLessThan(p.x2 - p.x1);
    expect(p.disponivel).toBeGreaterThan((p.x2 - p.x1) * 0.9);
  });

  it('bate com a medição feita na arte real', () => {
    const p = emPixels(LINHA_PADRAO, 1058, 1600);
    expect(Math.round(p.y)).toBe(1336);
    expect(Math.round(p.x1)).toBe(268);
    expect(Math.round(p.x2)).toBe(865);
  });
});

describe('tamanhoDaFonte', () => {
  it('escolhe o corpo que faz o texto caber', () => {
    expect(tamanhoDaFonte(400, 20)).toBe(20);
  });

  it('respeita o teto', () => {
    expect(tamanhoDaFonte(4000, 20, { minimo: 10, maximo: 44 })).toBe(44);
  });

  it('respeita o piso, mesmo que o texto estoure', () => {
    expect(tamanhoDaFonte(40, 20, { minimo: 10, maximo: 44 })).toBe(10);
  });

  it('não quebra com largura medida igual a zero', () => {
    expect(tamanhoDaFonte(400, 0)).toBe(10);
  });

  it('devolve sempre um inteiro', () => {
    expect(Number.isInteger(tamanhoDaFonte(333, 17))).toBe(true);
  });
});

describe('encurtarParaExibicao', () => {
  it('tira o https', () => {
    expect(encurtarParaExibicao('https://cha-da-flora.netlify.app/c/abc')).toBe(
      'cha-da-flora.netlify.app/c/abc',
    );
  });

  it('tira o http', () => {
    expect(encurtarParaExibicao('http://localhost:3001/c/abc')).toBe(
      'localhost:3001/c/abc',
    );
  });

  it('tira a barra do fim', () => {
    expect(encurtarParaExibicao('https://exemplo.com/c/abc/')).toBe('exemplo.com/c/abc');
  });

  it('deixa intacto o que já está curto', () => {
    expect(encurtarParaExibicao('exemplo.com/c/abc')).toBe('exemplo.com/c/abc');
  });
});

describe('porcentagem', () => {
  it('converte fração em porcentagem com uma casa', () => {
    expect(paraPorcentagem(0.835)).toBe(83.5);
    expect(paraPorcentagem(0.2533)).toBe(25.3);
  });

  it('converte porcentagem em fração', () => {
    expect(dePorcentagem(83.5)).toBeCloseTo(0.835, 4);
  });

  it('limita a fração entre zero e um', () => {
    expect(dePorcentagem(-10)).toBe(0);
    expect(dePorcentagem(250)).toBe(1);
  });

  it('fecha a ida e volta', () => {
    for (const fracao of [0.1, 0.253, 0.5, 0.835, 0.9]) {
      expect(dePorcentagem(paraPorcentagem(fracao))).toBeCloseTo(fracao, 3);
    }
  });
});
