import { describe, expect, it } from 'vitest';

import { SIMBOLOS_DO_TOKEN, compararSegredos, gerarToken, normalizarToken } from '@/lib/token';

describe('alfabeto do token', () => {
  it('tem exatamente 32 simbolos, para o sorteio nao ter vies', () => {
    expect(SIMBOLOS_DO_TOKEN).toHaveLength(32);
  });

  it('nao repete nenhum simbolo', () => {
    expect(new Set(SIMBOLOS_DO_TOKEN).size).toBe(32);
  });

  it('nao usa i, l, o nem u, que confundem com 1 e 0', () => {
    for (const proibido of ['i', 'l', 'o', 'u']) {
      expect(SIMBOLOS_DO_TOKEN).not.toContain(proibido);
    }
  });
});

describe('gerarToken', () => {
  it('usa o tamanho padrao de 16 caracteres', () => {
    expect(gerarToken()).toHaveLength(16);
  });

  it('respeita o tamanho pedido', () => {
    expect(gerarToken(10)).toHaveLength(10);
    expect(gerarToken(32)).toHaveLength(32);
  });

  it('so usa simbolos do alfabeto', () => {
    for (let i = 0; i < 200; i += 1) {
      for (const caractere of gerarToken()) {
        expect(SIMBOLOS_DO_TOKEN).toContain(caractere);
      }
    }
  });

  it('bate com a restricao de formato do banco', () => {
    for (let i = 0; i < 100; i += 1) {
      expect(gerarToken()).toMatch(/^[0-9a-z]{10,64}$/);
    }
  });

  it('nao repete em dez mil sorteios', () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 10000; i += 1) {
      vistos.add(gerarToken());
    }
    expect(vistos.size).toBe(10000);
  });

  it('nao e sequencial: dois tokens seguidos nao compartilham prefixo longo', () => {
    const a = gerarToken();
    const b = gerarToken();
    let iguais = 0;
    for (let i = 0; i < a.length && a[i] === b[i]; i += 1) iguais += 1;
    expect(iguais).toBeLessThan(5);
  });

  it('distribui os simbolos de forma razoavelmente uniforme', () => {
    const contagem = new Map<string, number>();
    const amostras = 20000;
    for (let i = 0; i < amostras; i += 1) {
      const caractere = gerarToken(10).charAt(0);
      contagem.set(caractere, (contagem.get(caractere) ?? 0) + 1);
    }

    const esperado = amostras / 32;
    expect(contagem.size).toBe(32);
    for (const total of contagem.values()) {
      // Margem larga de proposito: o teste pega vies grosseiro, nao ruido.
      expect(total).toBeGreaterThan(esperado * 0.7);
      expect(total).toBeLessThan(esperado * 1.3);
    }
  });

  it('recusa tamanho curto demais', () => {
    expect(() => gerarToken(9)).toThrow();
    expect(() => gerarToken(0)).toThrow();
    expect(() => gerarToken(-5)).toThrow();
  });

  it('recusa tamanho fracionario ou longo demais', () => {
    expect(() => gerarToken(16.5)).toThrow();
    expect(() => gerarToken(65)).toThrow();
  });
});

describe('normalizarToken', () => {
  it('aceita um token valido', () => {
    expect(normalizarToken('bcdfghjkmn')).toBe('bcdfghjkmn');
  });

  it('apara espacos e baixa a caixa', () => {
    expect(normalizarToken('  BCDFGHJKMN  ')).toBe('bcdfghjkmn');
  });

  it('recusa tamanho abaixo de dez', () => {
    expect(normalizarToken('bcdfghjkm')).toBeNull();
  });

  it('recusa caractere fora do formato', () => {
    expect(normalizarToken('bcdfghjkm-')).toBeNull();
    expect(normalizarToken('bcdf ghjkmn')).toBeNull();
    expect(normalizarToken('../../etc/passwd')).toBeNull();
  });

  it('recusa valor que nao e string', () => {
    expect(normalizarToken(null)).toBeNull();
    expect(normalizarToken(undefined)).toBeNull();
    expect(normalizarToken(12345678901)).toBeNull();
    expect(normalizarToken(['bcdfghjkmn'])).toBeNull();
  });
});

describe('compararSegredos', () => {
  it('reconhece segredos iguais', () => {
    expect(compararSegredos('senha-secreta', 'senha-secreta')).toBe(true);
  });

  it('recusa segredos diferentes', () => {
    expect(compararSegredos('senha-secreta', 'senha-errada')).toBe(false);
  });

  it('recusa quando os tamanhos diferem, sem lancar erro', () => {
    expect(compararSegredos('curta', 'uma-senha-bem-mais-longa')).toBe(false);
    expect(compararSegredos('', 'algo')).toBe(false);
  });

  it('trata string vazia contra string vazia como igual', () => {
    expect(compararSegredos('', '')).toBe(true);
  });

  it('diferencia maiuscula de minuscula', () => {
    expect(compararSegredos('Senha', 'senha')).toBe(false);
  });

  it('lida com acentos e emoji', () => {
    expect(compararSegredos('señá-🎉', 'señá-🎉')).toBe(true);
    expect(compararSegredos('señá-🎉', 'senha-🎉')).toBe(false);
  });
});
