import { describe, expect, it } from 'vitest';

import {
  escaparCampoCsv,
  filtrar,
  gerarCsv,
  nomeDoArquivoCsv,
  normalizarBusca,
  resumir,
  statusDoConvidado,
} from '@/lib/painel';
import type { Convidado } from '@/types/dominio';

function convidado(parcial: Partial<Convidado> & { nome: string }): Convidado {
  const base: Convidado = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    nome: parcial.nome,
    telefone: null,
    token: 'bcdfghjkmnpq',
    primeiraAberturaEm: null,
    ultimaAberturaEm: null,
    totalDeAberturas: 0,
    confirmadoEm: null,
    recusadoEm: null,
    criadoEm: new Date('2027-01-01T12:00:00.000Z'),
    acompanhantes: [],
    status: 'nao-abriu',
  };

  const montado = { ...base, ...parcial };
  return {
    ...montado,
    status: statusDoConvidado(montado),
  };
}

const ABERTURA = new Date('2027-02-01T12:00:00.000Z');
const RESPOSTA = new Date('2027-02-02T18:30:00.000Z');

describe('statusDoConvidado', () => {
  it('comeca como nao abriu', () => {
    expect(
      statusDoConvidado({
        primeiraAberturaEm: null,
        confirmadoEm: null,
        recusadoEm: null,
      }),
    ).toBe('nao-abriu');
  });

  it('vira sem resposta depois da abertura', () => {
    expect(
      statusDoConvidado({
        primeiraAberturaEm: ABERTURA,
        confirmadoEm: null,
        recusadoEm: null,
      }),
    ).toBe('sem-resposta');
  });

  it('vira confirmado quando ha confirmacao', () => {
    expect(
      statusDoConvidado({
        primeiraAberturaEm: ABERTURA,
        confirmadoEm: RESPOSTA,
        recusadoEm: null,
      }),
    ).toBe('confirmado');
  });

  it('vira recusado quando ha recusa', () => {
    expect(
      statusDoConvidado({
        primeiraAberturaEm: ABERTURA,
        confirmadoEm: null,
        recusadoEm: RESPOSTA,
      }),
    ).toBe('recusado');
  });

  it('mostra confirmado mesmo se o registro de abertura nao chegou', () => {
    expect(
      statusDoConvidado({
        primeiraAberturaEm: null,
        confirmadoEm: RESPOSTA,
        recusadoEm: null,
      }),
    ).toBe('confirmado');
  });
});

describe('resumir', () => {
  const lista: Convidado[] = [
    convidado({ nome: 'Sem abrir' }),
    convidado({ nome: 'Só abriu', primeiraAberturaEm: ABERTURA }),
    convidado({
      nome: 'Confirmou sozinha',
      primeiraAberturaEm: ABERTURA,
      confirmadoEm: RESPOSTA,
    }),
    convidado({
      nome: 'Confirmou com dois',
      primeiraAberturaEm: ABERTURA,
      confirmadoEm: RESPOSTA,
      acompanhantes: [
        { id: 'a1', nome: 'Filho', posicao: 0 },
        { id: 'a2', nome: 'Filha', posicao: 1 },
      ],
    }),
    convidado({
      nome: 'Recusou',
      primeiraAberturaEm: ABERTURA,
      recusadoEm: RESPOSTA,
    }),
  ];

  it('conta os cadastrados', () => {
    expect(resumir(lista).cadastrados).toBe(5);
  });

  it('separa quem abriu de quem nao abriu', () => {
    const r = resumir(lista);
    expect(r.abriram).toBe(4);
    expect(r.naoAbriram).toBe(1);
    expect(r.abriram + r.naoAbriram).toBe(r.cadastrados);
  });

  it('conta confirmados, recusas e pendentes', () => {
    const r = resumir(lista);
    expect(r.confirmados).toBe(2);
    expect(r.recusaram).toBe(1);
    expect(r.semResposta).toBe(2);
    expect(r.confirmados + r.recusaram + r.semResposta).toBe(r.cadastrados);
  });

  it('soma o convidado mais os acompanhantes no total de pessoas', () => {
    // Uma pessoa sozinha, mais uma com dois acompanhantes: 1 + 3 = 4.
    expect(resumir(lista).pessoasConfirmadas).toBe(4);
  });

  it('nao conta acompanhante de quem nao confirmou', () => {
    const comAcompanhanteSemConfirmar = [
      convidado({
        nome: 'Pendente',
        primeiraAberturaEm: ABERTURA,
        acompanhantes: [{ id: 'a1', nome: 'Alguém', posicao: 0 }],
      }),
    ];
    expect(resumir(comAcompanhanteSemConfirmar).pessoasConfirmadas).toBe(0);
  });

  it('aguenta lista vazia', () => {
    expect(resumir([])).toEqual({
      cadastrados: 0,
      abriram: 0,
      naoAbriram: 0,
      confirmados: 0,
      recusaram: 0,
      semResposta: 0,
      pessoasConfirmadas: 0,
    });
  });
});

describe('normalizarBusca', () => {
  it('tira acento e baixa a caixa', () => {
    expect(normalizarBusca('JOÃO Conceição')).toBe('joao conceicao');
  });

  it('apara as pontas', () => {
    expect(normalizarBusca('  Ana  ')).toBe('ana');
  });
});

describe('filtrar', () => {
  const lista: Convidado[] = [
    convidado({ nome: 'Ana Júlia', primeiraAberturaEm: ABERTURA, confirmadoEm: RESPOSTA }),
    convidado({ nome: 'Bruno', primeiraAberturaEm: ABERTURA }),
    convidado({ nome: 'Carla', recusadoEm: RESPOSTA }),
    convidado({
      nome: 'Diego',
      confirmadoEm: RESPOSTA,
      acompanhantes: [{ id: 'a1', nome: 'Mariana', posicao: 0 }],
    }),
  ];

  it('devolve tudo sem filtro', () => {
    expect(filtrar(lista, {})).toHaveLength(4);
    expect(filtrar(lista, { status: 'todos', busca: '' })).toHaveLength(4);
  });

  it('filtra por status', () => {
    expect(filtrar(lista, { status: 'confirmado' }).map((c) => c.nome)).toEqual([
      'Ana Júlia',
      'Diego',
    ]);
    expect(filtrar(lista, { status: 'recusado' }).map((c) => c.nome)).toEqual(['Carla']);
    expect(filtrar(lista, { status: 'sem-resposta' }).map((c) => c.nome)).toEqual([
      'Bruno',
    ]);
  });

  it('busca por nome ignorando acento e caixa', () => {
    expect(filtrar(lista, { busca: 'ana julia' }).map((c) => c.nome)).toEqual([
      'Ana Júlia',
    ]);
    expect(filtrar(lista, { busca: 'JÚLIA' }).map((c) => c.nome)).toEqual(['Ana Júlia']);
  });

  it('acha pelo nome do acompanhante', () => {
    expect(filtrar(lista, { busca: 'mariana' }).map((c) => c.nome)).toEqual(['Diego']);
  });

  it('combina status com busca', () => {
    expect(filtrar(lista, { status: 'confirmado', busca: 'diego' })).toHaveLength(1);
    expect(filtrar(lista, { status: 'recusado', busca: 'diego' })).toHaveLength(0);
  });

  it('devolve vazio quando nada casa', () => {
    expect(filtrar(lista, { busca: 'zzzz' })).toEqual([]);
  });
});

describe('escaparCampoCsv', () => {
  it('deixa texto simples intacto', () => {
    expect(escaparCampoCsv('Maria')).toBe('Maria');
  });

  it('envolve em aspas quando ha virgula', () => {
    expect(escaparCampoCsv('Silva, Maria')).toBe('"Silva, Maria"');
  });

  it('dobra as aspas internas', () => {
    expect(escaparCampoCsv('Maria "Mari"')).toBe('"Maria ""Mari"""');
  });

  it('envolve em aspas quando ha quebra de linha', () => {
    expect(escaparCampoCsv('a\nb')).toBe('"a\nb"');
  });

  it('envolve em aspas quando ha ponto e virgula', () => {
    expect(escaparCampoCsv('João; Ana')).toBe('"João; Ana"');
  });

  it('neutraliza formula para o Excel nao executar nada', () => {
    expect(escaparCampoCsv('=1+1')).toBe("'=1+1");
    expect(escaparCampoCsv('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(escaparCampoCsv('+55 11 99999')).toBe("'+55 11 99999");
    expect(escaparCampoCsv('-1')).toBe("'-1");
  });

  it('neutraliza formula e ainda envolve em aspas quando precisa', () => {
    expect(escaparCampoCsv('=HYPERLINK("x","y")')).toBe(
      '"\'=HYPERLINK(""x"",""y"")"',
    );
  });

  it('preserva espacos das pontas entre aspas', () => {
    expect(escaparCampoCsv(' Maria ')).toBe('" Maria "');
  });
});

describe('gerarCsv', () => {
  const lista: Convidado[] = [
    convidado({
      nome: 'Ana Júlia',
      telefone: '5511988887777',
      primeiraAberturaEm: ABERTURA,
      ultimaAberturaEm: RESPOSTA,
      totalDeAberturas: 3,
      confirmadoEm: RESPOSTA,
      token: 'bcdfghjkmnpq',
      acompanhantes: [
        { id: 'a1', nome: 'Pedro', posicao: 0 },
        { id: 'a2', nome: 'Lia', posicao: 1 },
      ],
    }),
    convidado({ nome: 'Bruno', token: 'qpnmkjhgfdcb' }),
  ];

  it('comeca com BOM, para o Excel ler os acentos', () => {
    expect(gerarCsv(lista).charCodeAt(0)).toBe(0xfeff);
  });

  it('usa CRLF entre as linhas', () => {
    const csv = gerarCsv(lista);
    expect(csv).toContain('\r\n');
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('tem uma linha de cabecalho mais uma por convidado', () => {
    const linhas = gerarCsv(lista).trimEnd().split('\r\n');
    expect(linhas).toHaveLength(3);
    expect(linhas[0]).toContain('Nome');
    expect(linhas[0]).toContain('Link do convite');
  });

  it('junta os acompanhantes em uma celula so', () => {
    expect(gerarCsv(lista)).toContain('"Pedro; Lia"');
  });

  it('conta o convidado mais os acompanhantes no total de pessoas', () => {
    const linhas = gerarCsv(lista).trimEnd().split('\r\n');
    expect(linhas[1]?.split(',')).toContain('3');
  });

  it('zera o total de pessoas de quem nao confirmou', () => {
    const linhas = gerarCsv(lista).trimEnd().split('\r\n');
    expect(linhas[2]).toContain('Não abriu');
    expect(linhas[2]?.split(',')).toContain('0');
  });

  it('monta o link completo quando recebe a URL base', () => {
    expect(gerarCsv(lista, { urlBase: 'https://exemplo.com' })).toContain(
      'https://exemplo.com/c/bcdfghjkmnpq',
    );
  });

  it('nao duplica a barra da URL base', () => {
    expect(gerarCsv(lista, { urlBase: 'https://exemplo.com/' })).toContain(
      'https://exemplo.com/c/bcdfghjkmnpq',
    );
  });

  it('usa so o token quando nao recebe URL base', () => {
    const csv = gerarCsv(lista);
    expect(csv).toContain('bcdfghjkmnpq');
    expect(csv).not.toContain('https://');
  });

  it('gera so o cabecalho para lista vazia', () => {
    expect(gerarCsv([]).trimEnd().split('\r\n')).toHaveLength(1);
  });

  it('nao deixa um nome perigoso virar formula', () => {
    const malicioso = [convidado({ nome: '=cmd|calc' })];
    expect(gerarCsv(malicioso)).toContain("'=cmd|calc");
  });
});

describe('nomeDoArquivoCsv', () => {
  it('inclui a data no nome', () => {
    expect(nomeDoArquivoCsv(new Date(2027, 2, 5))).toBe('convidados-2027-03-05.csv');
  });
});
