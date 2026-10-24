import { describe, expect, it } from 'vitest';

import {
  LIMITE_LOTE,
  confirmacaoSchema,
  edicaoConvidadoSchema,
  eventoSchema,
  limparTexto,
  limparTextoMultilinha,
  loginSchema,
  loteSchema,
  nomeSchema,
  normalizarTelefone,
  novoConvidadoSchema,
  paletaSchema,
  primeiroErro,
  recusaSchema,
} from '@/lib/validacao';

describe('limparTexto', () => {
  it('apara as pontas', () => {
    expect(limparTexto('  Maria  ')).toBe('Maria');
  });

  it('junta espacos repetidos', () => {
    expect(limparTexto('Maria    das     Dores')).toBe('Maria das Dores');
  });

  it('remove caracteres de controle', () => {
    expect(limparTexto('Ma\u0007ri\u0000a')).toBe('Ma ri a');
  });

  it('troca quebra de linha por espaco', () => {
    expect(limparTexto('Maria\nSilva')).toBe('Maria Silva');
  });

  it('preserva acentos e cedilha', () => {
    expect(limparTexto('  João Conceição  ')).toBe('João Conceição');
  });
});

describe('limparTextoMultilinha', () => {
  it('preserva as quebras de linha', () => {
    expect(limparTextoMultilinha('linha 1\nlinha 2')).toBe('linha 1\nlinha 2');
  });

  it('normaliza CRLF', () => {
    expect(limparTextoMultilinha('linha 1\r\nlinha 2')).toBe('linha 1\nlinha 2');
  });

  it('reduz tres ou mais quebras seguidas para duas', () => {
    expect(limparTextoMultilinha('a\n\n\n\n\nb')).toBe('a\n\nb');
  });

  it('limpa os espacos de cada linha', () => {
    expect(limparTextoMultilinha('  a   b  \n   c  ')).toBe('a b\nc');
  });

  it('remove controles mas mantem a quebra', () => {
    expect(limparTextoMultilinha('a\u0007\nb')).toBe('a\nb');
  });
});

describe('nomeSchema', () => {
  it('aceita e limpa um nome comum', () => {
    expect(nomeSchema.parse('  Maria   Silva ')).toBe('Maria Silva');
  });

  it('recusa nome vazio', () => {
    expect(nomeSchema.safeParse('   ').success).toBe(false);
  });

  it('recusa nome longo demais', () => {
    expect(nomeSchema.safeParse('a'.repeat(81)).success).toBe(false);
    expect(nomeSchema.safeParse('a'.repeat(80)).success).toBe(true);
  });

  it('recusa marcacao HTML', () => {
    expect(nomeSchema.safeParse('<script>alert(1)</script>').success).toBe(false);
    expect(nomeSchema.safeParse('Maria <b>').success).toBe(false);
    expect(nomeSchema.safeParse('a > b').success).toBe(false);
  });

  it('recusa valor que nao e string', () => {
    expect(nomeSchema.safeParse(42).success).toBe(false);
    expect(nomeSchema.safeParse(null).success).toBe(false);
  });
});

describe('normalizarTelefone', () => {
  it('tira a formatacao', () => {
    expect(normalizarTelefone('(11) 98888-7777')).toBe('5511988887777');
  });

  it('acrescenta o 55 em numero brasileiro de dez ou onze digitos', () => {
    expect(normalizarTelefone('11988887777')).toBe('5511988887777');
    expect(normalizarTelefone('1133334444')).toBe('551133334444');
  });

  it('nao duplica o codigo do pais', () => {
    expect(normalizarTelefone('5511988887777')).toBe('5511988887777');
  });

  it('aceita numero internacional', () => {
    expect(normalizarTelefone('+351 912 345 678')).toBe('351912345678');
  });

  it('devolve null para vazio ou invalido', () => {
    expect(normalizarTelefone(null)).toBeNull();
    expect(normalizarTelefone('')).toBeNull();
    expect(normalizarTelefone('   ')).toBeNull();
    expect(normalizarTelefone('abc')).toBeNull();
    expect(normalizarTelefone('123')).toBeNull();
    expect(normalizarTelefone('1'.repeat(16))).toBeNull();
  });
});

describe('confirmacaoSchema', () => {
  it('aceita so o convidado, sem acompanhante', () => {
    const r = confirmacaoSchema.parse({ nome: 'Maria', acompanhantes: [] });
    expect(r).toEqual({ nome: 'Maria', acompanhantes: [] });
  });

  it('usa lista vazia como padrao', () => {
    expect(confirmacaoSchema.parse({ nome: 'Maria' }).acompanhantes).toEqual([]);
  });

  it('limpa o nome de cada acompanhante', () => {
    const r = confirmacaoSchema.parse({
      nome: ' Maria ',
      acompanhantes: ['  João  ', 'Ana   Clara'],
    });
    expect(r.acompanhantes).toEqual(['João', 'Ana Clara']);
  });

  it('recusa acompanhante com nome vazio', () => {
    expect(
      confirmacaoSchema.safeParse({ nome: 'Maria', acompanhantes: ['  '] }).success,
    ).toBe(false);
  });

  it('recusa acompanhantes demais', () => {
    const muitos = Array.from({ length: 11 }, (_, i) => `Pessoa ${i}`);
    expect(
      confirmacaoSchema.safeParse({ nome: 'Maria', acompanhantes: muitos }).success,
    ).toBe(false);
  });
});

describe('recusaSchema', () => {
  it('exige apenas o nome', () => {
    expect(recusaSchema.parse({ nome: ' Maria ' })).toEqual({ nome: 'Maria' });
  });
});

describe('novoConvidadoSchema', () => {
  it('aceita convidado sem telefone', () => {
    expect(novoConvidadoSchema.parse({ nome: 'Maria' })).toEqual({
      nome: 'Maria',
      telefone: null,
    });
  });

  it('normaliza o telefone informado', () => {
    expect(
      novoConvidadoSchema.parse({ nome: 'Maria', telefone: '(11) 98888-7777' }),
    ).toEqual({ nome: 'Maria', telefone: '5511988887777' });
  });
});

describe('edicaoConvidadoSchema', () => {
  it('exige um id em formato uuid', () => {
    expect(
      edicaoConvidadoSchema.safeParse({ id: 'nao-e-uuid', nome: 'Maria' }).success,
    ).toBe(false);
    expect(
      edicaoConvidadoSchema.safeParse({
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        nome: 'Maria',
      }).success,
    ).toBe(true);
  });
});

describe('loteSchema', () => {
  it('quebra a lista em um nome por linha', () => {
    expect(loteSchema.parse('Maria\nJoão\nAna')).toEqual(['Maria', 'João', 'Ana']);
  });

  it('ignora linhas vazias', () => {
    expect(loteSchema.parse('Maria\n\n\n  \nAna')).toEqual(['Maria', 'Ana']);
  });

  it('remove repetidos sem diferenciar maiuscula', () => {
    expect(loteSchema.parse('Maria\nmaria\nMARIA\nAna')).toEqual(['Maria', 'Ana']);
  });

  it('aceita CRLF', () => {
    expect(loteSchema.parse('Maria\r\nAna')).toEqual(['Maria', 'Ana']);
  });

  it('descarta linha com HTML e linha longa demais', () => {
    expect(loteSchema.parse(`Maria\n<b>Ana</b>\n${'x'.repeat(81)}\nJoão`)).toEqual([
      'Maria',
      'João',
    ]);
  });

  it('para no limite de linhas', () => {
    const lista = Array.from({ length: LIMITE_LOTE + 50 }, (_, i) => `Pessoa ${i}`);
    expect(loteSchema.parse(lista.join('\n'))).toHaveLength(LIMITE_LOTE);
  });

  it('recusa lista sem nenhum nome valido', () => {
    expect(loteSchema.safeParse('   \n\n  ').success).toBe(false);
    expect(loteSchema.safeParse('<b></b>').success).toBe(false);
  });
});

describe('eventoSchema', () => {
  const base = {
    titulo: 'Chá de Bebê',
    inicio: '2027-03-14T15:00',
    fim: '2027-03-14T18:00',
    localNome: 'Casa da Vó',
    localEndereco: 'Rua das Acácias, 221',
    observacoes: 'Traga só a sua alegria.',
    mensagemConvite: 'Oi, {nome}!',
    maxAcompanhantes: 3,
  };

  it('aceita um evento completo', () => {
    const r = eventoSchema.parse(base);
    expect(r.titulo).toBe('Chá de Bebê');
    expect(r.maxAcompanhantes).toBe(3);
  });

  it('aceita evento sem termino', () => {
    expect(eventoSchema.safeParse({ ...base, fim: null }).success).toBe(true);
  });

  it('recusa termino antes do inicio', () => {
    const r = eventoSchema.safeParse({ ...base, fim: '2027-03-14T10:00' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['fim']);
  });

  it('aceita termino igual ao inicio', () => {
    expect(eventoSchema.safeParse({ ...base, fim: base.inicio }).success).toBe(true);
  });

  it('recusa data em formato brasileiro', () => {
    expect(eventoSchema.safeParse({ ...base, inicio: '14/03/2027 15:00' }).success).toBe(
      false,
    );
  });

  it('converte o limite de acompanhantes vindo como texto do formulario', () => {
    expect(eventoSchema.parse({ ...base, maxAcompanhantes: '5' }).maxAcompanhantes).toBe(
      5,
    );
  });

  it('recusa limite fora da faixa', () => {
    expect(eventoSchema.safeParse({ ...base, maxAcompanhantes: -1 }).success).toBe(false);
    expect(eventoSchema.safeParse({ ...base, maxAcompanhantes: 11 }).success).toBe(false);
  });

  it('aceita zero acompanhantes', () => {
    expect(eventoSchema.safeParse({ ...base, maxAcompanhantes: 0 }).success).toBe(true);
  });

  it('transforma campo opcional vazio em null', () => {
    const r = eventoSchema.parse({ ...base, localNome: '   ', observacoes: '' });
    expect(r.localNome).toBeNull();
    expect(r.observacoes).toBeNull();
  });

  it('preserva as quebras de linha da mensagem', () => {
    const r = eventoSchema.parse({ ...base, mensagemConvite: 'Oi!\n\nVem?' });
    expect(r.mensagemConvite).toBe('Oi!\n\nVem?');
  });

  it('recusa HTML no titulo', () => {
    expect(eventoSchema.safeParse({ ...base, titulo: '<h1>Festa</h1>' }).success).toBe(
      false,
    );
  });
});

describe('paletaSchema', () => {
  const valida = {
    fundo: '#f2ece1',
    papel: '#fdfaf4',
    tinta: '#2b2721',
    tintaSuave: '#5b5347',
    destaque: '#8a5a3c',
    tintaDoDestaque: '#ffffff',
    borda: '#ddd3c2',
  };

  it('aceita uma paleta completa', () => {
    expect(paletaSchema.safeParse(valida).success).toBe(true);
  });

  it('recusa cor sem cerquilha ou em formato curto', () => {
    expect(paletaSchema.safeParse({ ...valida, fundo: 'f2ece1' }).success).toBe(false);
    expect(paletaSchema.safeParse({ ...valida, fundo: '#fff' }).success).toBe(false);
  });

  it('recusa valor que tenta injetar codigo', () => {
    expect(
      paletaSchema.safeParse({ ...valida, fundo: 'red; background:url(x)' }).success,
    ).toBe(false);
  });

  it('recusa paleta incompleta', () => {
    const { borda: _borda, ...semBorda } = valida;
    expect(paletaSchema.safeParse(semBorda).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('exige senha', () => {
    expect(loginSchema.safeParse({ senha: '' }).success).toBe(false);
    expect(loginSchema.safeParse({ senha: 'abc' }).success).toBe(true);
  });

  it('recusa senha absurdamente longa', () => {
    expect(loginSchema.safeParse({ senha: 'a'.repeat(201) }).success).toBe(false);
  });
});

describe('primeiroErro', () => {
  it('devolve a mensagem do primeiro problema', () => {
    const r = nomeSchema.safeParse('');
    expect(r.success).toBe(false);
    expect(primeiroErro(r.error!)).toBe('Informe o nome.');
  });
});
