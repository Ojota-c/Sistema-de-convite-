import { describe, expect, it } from 'vitest';

import {
  CONTRASTE_AA,
  CONTRASTE_AAA,
  PALETA_PADRAO,
  ajustarParaContraste,
  hexParaOklch,
  hexParaRgb,
  lerPaleta,
  melhorTextoSobre,
  montarPaleta,
  oklchParaHex,
  paletaParaVariaveisCss,
  quantizarPixels,
  razaoDeContraste,
  rgbParaHex,
  rgbParaOklch,
} from '@/lib/paleta';

describe('conversao hexadecimal', () => {
  it('le a forma longa', () => {
    expect(hexParaRgb('#ff8800')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('le a forma curta', () => {
    expect(hexParaRgb('#f80')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('aceita sem cerquilha e com maiuscula', () => {
    expect(hexParaRgb('FF8800')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('recusa lixo', () => {
    expect(hexParaRgb('vermelho')).toBeNull();
    expect(hexParaRgb('#12345')).toBeNull();
    expect(hexParaRgb('')).toBeNull();
  });

  it('volta para hexadecimal com dois digitos por canal', () => {
    expect(rgbParaHex({ r: 0, g: 136, b: 255 })).toBe('#0088ff');
  });

  it('limita canais fora da faixa', () => {
    expect(rgbParaHex({ r: -20, g: 300, b: 128 })).toBe('#00ff80');
  });
});

describe('ida e volta entre sRGB e OKLCH', () => {
  const amostras = [
    '#000000',
    '#ffffff',
    '#808080',
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#8a5a3c',
    '#f2ece1',
    '#2b7a78',
    '#e8a0bf',
  ];

  it.each(amostras)('preserva %s dentro de um ponto por canal', (cor) => {
    const oklch = hexParaOklch(cor);
    expect(oklch).not.toBeNull();

    const volta = hexParaRgb(oklchParaHex(oklch!));
    const original = hexParaRgb(cor)!;

    expect(Math.abs(volta!.r - original.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(volta!.g - original.g)).toBeLessThanOrEqual(1);
    expect(Math.abs(volta!.b - original.b)).toBeLessThanOrEqual(1);
  });

  it('da luminosidade zero ao preto e um ao branco', () => {
    expect(rgbParaOklch({ r: 0, g: 0, b: 0 }).l).toBeCloseTo(0, 5);
    expect(rgbParaOklch({ r: 255, g: 255, b: 255 }).l).toBeCloseTo(1, 3);
  });

  it('da croma praticamente zero para um cinza', () => {
    expect(rgbParaOklch({ r: 128, g: 128, b: 128 }).c).toBeLessThan(0.001);
  });

  it('traz uma cor fora de gamut de volta reduzindo o croma, nao cortando canais', () => {
    // Croma alto demais para existir no sRGB nessa luminosidade.
    const hex = oklchParaHex({ l: 0.6, c: 0.9, h: 150 });
    const rgb = hexParaRgb(hex)!;

    expect(rgb.r).toBeGreaterThanOrEqual(0);
    expect(rgb.g).toBeLessThanOrEqual(255);

    // O matiz tem de sobreviver ao ajuste.
    const matizFinal = rgbParaOklch(rgb).h;
    expect(Math.abs(matizFinal - 150)).toBeLessThan(12);
  });
});

describe('razaoDeContraste', () => {
  it('da 21 entre preto e branco', () => {
    expect(razaoDeContraste('#000000', '#ffffff')).toBeCloseTo(21, 2);
  });

  it('da 1 para a cor contra ela mesma', () => {
    expect(razaoDeContraste('#8a5a3c', '#8a5a3c')).toBeCloseTo(1, 5);
  });

  it('nao depende da ordem', () => {
    expect(razaoDeContraste('#123456', '#fedcba')).toBeCloseTo(
      razaoDeContraste('#fedcba', '#123456'),
      5,
    );
  });

  it('devolve 1 quando alguma cor e invalida', () => {
    expect(razaoDeContraste('lilás', '#ffffff')).toBe(1);
  });
});

describe('ajustarParaContraste', () => {
  const fundosClaros = ['#ffffff', '#fdfaf4', '#f2ece1', '#eee8dd'];
  const coresFracas = ['#ffe9a8', '#cfe8d4', '#f6c9d8', '#dddddd', '#b8d8f0'];

  it.each(fundosClaros)('alcanca AA sobre o fundo claro %s', (fundo) => {
    for (const cor of coresFracas) {
      const ajustada = ajustarParaContraste(cor, fundo, CONTRASTE_AA);
      expect(razaoDeContraste(ajustada, fundo)).toBeGreaterThanOrEqual(CONTRASTE_AA);
    }
  });

  it('alcanca AA sobre fundo escuro, clareando a cor', () => {
    for (const cor of ['#3a2a1a', '#20303a', '#2b2721']) {
      const ajustada = ajustarParaContraste(cor, '#121212', CONTRASTE_AA);
      expect(razaoDeContraste(ajustada, '#121212')).toBeGreaterThanOrEqual(
        CONTRASTE_AA,
      );
    }
  });

  it('nao mexe na cor que ja passa', () => {
    expect(ajustarParaContraste('#1a1a1a', '#ffffff', CONTRASTE_AA)).toBe('#1a1a1a');
  });

  it('preserva o matiz ao escurecer', () => {
    const original = hexParaOklch('#f6c9d8')!;
    const ajustada = hexParaOklch(
      ajustarParaContraste('#f6c9d8', '#ffffff', CONTRASTE_AA),
    )!;
    expect(Math.abs(ajustada.h - original.h)).toBeLessThan(10);
  });

  it('chega a AAA quando pedido', () => {
    const ajustada = ajustarParaContraste('#8a5a3c', '#fdfaf4', CONTRASTE_AAA);
    expect(razaoDeContraste(ajustada, '#fdfaf4')).toBeGreaterThanOrEqual(
      CONTRASTE_AAA,
    );
  });
});

describe('melhorTextoSobre', () => {
  it.each([
    '#8a5a3c',
    '#2b7a78',
    '#b03060',
    '#ffe9a8',
    '#101010',
    '#f5f5f5',
    '#7a7a7a',
  ])('escolhe um texto com contraste AA sobre %s', (fundo) => {
    const texto = melhorTextoSobre(fundo);
    expect(razaoDeContraste(texto, fundo)).toBeGreaterThanOrEqual(CONTRASTE_AA);
  });
});

describe('montarPaleta', () => {
  const amostrasDeImagem: string[][] = [
    ['#f6c9d8', '#f2ece1', '#d9b3c4'],
    ['#2b7a78', '#def2f1', '#17252a'],
    ['#ffe9a8', '#fff8e7', '#f0d98c'],
    ['#dddddd', '#cccccc', '#eeeeee'],
    ['#101010', '#202020', '#303030'],
    ['#ff0000'],
    ['#0000ff'],
    ['#8a5a3c', '#c9a227'],
  ];

  it.each(amostrasDeImagem)(
    'garante contraste acessivel para a imagem com cor base %s',
    (...cores) => {
      const paleta = montarPaleta(cores);

      expect(razaoDeContraste(paleta.tinta, paleta.papel)).toBeGreaterThanOrEqual(
        CONTRASTE_AAA,
      );
      expect(
        razaoDeContraste(paleta.tintaSuave, paleta.papel),
      ).toBeGreaterThanOrEqual(CONTRASTE_AA);
      expect(razaoDeContraste(paleta.destaque, paleta.papel)).toBeGreaterThanOrEqual(
        CONTRASTE_AA,
      );
      expect(
        razaoDeContraste(paleta.tintaDoDestaque, paleta.destaque),
      ).toBeGreaterThanOrEqual(CONTRASTE_AA);
      expect(razaoDeContraste(paleta.tinta, paleta.fundo)).toBeGreaterThanOrEqual(
        CONTRASTE_AA,
      );
    },
  );

  it('devolve todas as cores em hexadecimal de seis digitos', () => {
    const paleta = montarPaleta(['#2b7a78']);
    for (const valor of Object.values(paleta)) {
      expect(valor).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('cai no padrao quando nao recebe cor valida', () => {
    expect(montarPaleta([])).toEqual(PALETA_PADRAO);
    expect(montarPaleta(['nao', 'e', 'cor'])).toEqual(PALETA_PADRAO);
  });

  it('usa a cor mais cromatica como base, nao a primeira da lista', () => {
    const comCinzaNaFrente = montarPaleta(['#cfcfcf', '#2b7a78']);
    const soComAVerde = montarPaleta(['#2b7a78']);
    expect(comCinzaNaFrente.destaque).toBe(soComAVerde.destaque);
  });

  it('mantem o papel mais claro que o fundo', () => {
    const paleta = montarPaleta(['#8a5a3c']);
    const luminanciaPapel = hexParaOklch(paleta.papel)!.l;
    const luminanciaFundo = hexParaOklch(paleta.fundo)!.l;
    expect(luminanciaPapel).toBeGreaterThan(luminanciaFundo);
  });
});

describe('PALETA_PADRAO', () => {
  it('ja nasce acessivel', () => {
    expect(
      razaoDeContraste(PALETA_PADRAO.tinta, PALETA_PADRAO.papel),
    ).toBeGreaterThanOrEqual(CONTRASTE_AAA);
    expect(
      razaoDeContraste(PALETA_PADRAO.tintaSuave, PALETA_PADRAO.papel),
    ).toBeGreaterThanOrEqual(CONTRASTE_AA);
    expect(
      razaoDeContraste(PALETA_PADRAO.destaque, PALETA_PADRAO.papel),
    ).toBeGreaterThanOrEqual(CONTRASTE_AA);
    expect(
      razaoDeContraste(PALETA_PADRAO.tintaDoDestaque, PALETA_PADRAO.destaque),
    ).toBeGreaterThanOrEqual(CONTRASTE_AA);
  });
});

describe('quantizarPixels', () => {
  function pixels(cores: Array<[number, number, number, number]>): Uint8ClampedArray {
    const dados = new Uint8ClampedArray(cores.length * 4);
    cores.forEach(([r, g, b, a], i) => {
      dados[i * 4] = r;
      dados[i * 4 + 1] = g;
      dados[i * 4 + 2] = b;
      dados[i * 4 + 3] = a;
    });
    return dados;
  }

  it('devolve a cor mais frequente primeiro', () => {
    const dados = pixels([
      [200, 40, 40, 255],
      [200, 40, 40, 255],
      [200, 40, 40, 255],
      [40, 40, 200, 255],
    ]);
    const cores = quantizarPixels(dados, 2);
    expect(cores[0]).toBe('#c82828');
    expect(cores).toHaveLength(2);
  });

  it('ignora pixels transparentes', () => {
    const dados = pixels([
      [200, 40, 40, 0],
      [200, 40, 40, 0],
      [40, 40, 200, 255],
    ]);
    expect(quantizarPixels(dados, 3)).toEqual(['#2828c8']);
  });

  it('descarta branco e preto quase puros, que dominariam o papel', () => {
    const dados = pixels([
      [252, 252, 252, 255],
      [252, 252, 252, 255],
      [2, 2, 2, 255],
      [138, 90, 60, 255],
    ]);
    expect(quantizarPixels(dados, 5)).toEqual(['#8a5a3c']);
  });

  it('devolve lista vazia quando nao sobra nenhum pixel util', () => {
    expect(quantizarPixels(pixels([[255, 255, 255, 255]]), 4)).toEqual([]);
  });

  it('respeita a quantidade pedida', () => {
    const dados = pixels([
      [200, 40, 40, 255],
      [40, 200, 40, 255],
      [40, 40, 200, 255],
      [200, 200, 40, 255],
    ]);
    expect(quantizarPixels(dados, 2)).toHaveLength(2);
  });
});

describe('lerPaleta', () => {
  it('aceita uma paleta completa', () => {
    const paleta = montarPaleta(['#2b7a78']);
    expect(lerPaleta(paleta)).toEqual(paleta);
  });

  it('completa campos faltando com o padrao', () => {
    const lida = lerPaleta({ destaque: '#2b7a78' });
    expect(lida.destaque).toBe('#2b7a78');
    expect(lida.tinta).toBe(PALETA_PADRAO.tinta);
  });

  it('ignora valores invalidos sem lancar erro', () => {
    const lida = lerPaleta({ destaque: 'javascript:alert(1)', tinta: 42 });
    expect(lida).toEqual(PALETA_PADRAO);
  });

  it('cai no padrao para entrada que nao e objeto', () => {
    expect(lerPaleta(null)).toEqual(PALETA_PADRAO);
    expect(lerPaleta('#fff')).toEqual(PALETA_PADRAO);
    expect(lerPaleta(undefined)).toEqual(PALETA_PADRAO);
  });

  it('normaliza a forma curta para a longa', () => {
    expect(lerPaleta({ destaque: '#f80' }).destaque).toBe('#ff8800');
  });
});

describe('paletaParaVariaveisCss', () => {
  it('devolve variaveis CSS com os nomes esperados', () => {
    const variaveis = paletaParaVariaveisCss(PALETA_PADRAO);
    expect(variaveis['--cor-papel']).toBe(PALETA_PADRAO.papel);
    expect(variaveis['--cor-destaque']).toBe(PALETA_PADRAO.destaque);
    expect(Object.keys(variaveis)).toHaveLength(7);
    for (const chave of Object.keys(variaveis)) {
      expect(chave.startsWith('--cor-')).toBe(true);
    }
  });
});
