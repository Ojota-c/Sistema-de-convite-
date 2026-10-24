import { describe, expect, it } from 'vitest';

import { acharVariante, contarPorVariante, resolverArte, variantesSemArte } from '@/lib/arte';
import { LINHA_PADRAO } from '@/lib/linha-do-link';
import { PALETA_PADRAO, montarPaleta } from '@/lib/paleta';
import type { Evento, Variante } from '@/types/dominio';

const PALETA_DO_EVENTO = PALETA_PADRAO;
const PALETA_DA_VARIANTE = montarPaleta(['#2b7a78']);

const EVENTO: Evento = {
  titulo: 'Chá da Flora',
  inicio: new Date('2026-11-21T19:00:00.000Z'),
  fim: null,
  localNome: 'Condomínio Residencial Fabiane Theonas',
  localEndereco: 'Av. João Leite, 360',
  observacoes: null,
  mensagemConvite: null,
  caminhoDaImagem: 'convite-geral.jpg',
  tipoDaImagem: 'image/jpeg',
  larguraDaImagem: 1058,
  alturaDaImagem: 1600,
  paleta: PALETA_DO_EVENTO,
  maxAcompanhantes: 3,
  fuso: 'America/Sao_Paulo',
  linhaDoLink: LINHA_PADRAO,
  atualizadoEm: new Date('2026-10-24T12:00:00.000Z'),
};

function variante(parcial: Partial<Variante> & { codigo: string }): Variante {
  return {
    codigo: parcial.codigo,
    descricao: parcial.descricao ?? `Fraldas tamanho ${parcial.codigo}`,
    posicao: parcial.posicao ?? 0,
    caminhoDaImagem: parcial.caminhoDaImagem ?? null,
    tipoDaImagem: parcial.tipoDaImagem ?? null,
    larguraDaImagem: parcial.larguraDaImagem ?? null,
    alturaDaImagem: parcial.alturaDaImagem ?? null,
    paleta: parcial.paleta ?? null,
    temImagem: parcial.temImagem ?? Boolean(parcial.caminhoDaImagem),
  };
}

const COM_ARTE = variante({
  codigo: 'M',
  caminhoDaImagem: 'variante-m-123.jpg',
  tipoDaImagem: 'image/jpeg',
  larguraDaImagem: 1058,
  alturaDaImagem: 1600,
  paleta: PALETA_DA_VARIANTE,
  posicao: 1,
});

const SEM_ARTE = variante({ codigo: 'G', posicao: 2 });

describe('resolverArte', () => {
  it('usa a arte da variante quando ela existe', () => {
    const arte = resolverArte(EVENTO, COM_ARTE);
    expect(arte.caminho).toBe('variante-m-123.jpg');
    expect(arte.codigo).toBe('M');
    expect(arte.descricao).toBe('Fraldas tamanho M');
  });

  it('usa a paleta da variante, não a do evento', () => {
    expect(resolverArte(EVENTO, COM_ARTE).paleta).toEqual(PALETA_DA_VARIANTE);
  });

  it('leva as dimensões da variante, que a prévia do WhatsApp usa', () => {
    const arte = resolverArte(EVENTO, COM_ARTE);
    expect(arte.largura).toBe(1058);
    expect(arte.altura).toBe(1600);
  });

  it('cai na imagem do evento quando a variante ainda não tem arte', () => {
    const arte = resolverArte(EVENTO, SEM_ARTE);
    expect(arte.caminho).toBe('convite-geral.jpg');
    expect(arte.paleta).toEqual(PALETA_DO_EVENTO);
  });

  it('mantém a descrição mesmo sem arte própria, por causa do leitor de tela', () => {
    // O tamanho da fralda não pode existir só desenhado na imagem.
    expect(resolverArte(EVENTO, SEM_ARTE).descricao).toBe('Fraldas tamanho G');
    expect(resolverArte(EVENTO, SEM_ARTE).codigo).toBe('G');
  });

  it('cai na imagem do evento quando o convidado não tem variante', () => {
    const arte = resolverArte(EVENTO, null);
    expect(arte.caminho).toBe('convite-geral.jpg');
    expect(arte.descricao).toBeNull();
    expect(arte.codigo).toBeNull();
  });

  it('aguenta o evento sem imagem nenhuma', () => {
    const semImagem = { ...EVENTO, caminhoDaImagem: null, tipoDaImagem: null };
    expect(resolverArte(semImagem, null).caminho).toBeNull();
    expect(resolverArte(semImagem, SEM_ARTE).caminho).toBeNull();
  });

  it('usa a paleta do evento quando a variante tem arte mas não tem paleta', () => {
    const semPaleta = variante({ codigo: 'P', caminhoDaImagem: 'p.jpg' });
    expect(resolverArte(EVENTO, semPaleta).paleta).toEqual(PALETA_DO_EVENTO);
  });

  it('nunca devolve uma paleta nula, para a página não ficar sem cor', () => {
    for (const v of [COM_ARTE, SEM_ARTE, null, undefined]) {
      expect(resolverArte(EVENTO, v).paleta).toBeTruthy();
    }
  });
});

describe('acharVariante', () => {
  const lista = [variante({ codigo: 'P' }), COM_ARTE, SEM_ARTE];

  it('acha pelo código', () => {
    expect(acharVariante(lista, 'M')?.codigo).toBe('M');
  });

  it('não diferencia maiúscula de minúscula', () => {
    expect(acharVariante(lista, 'm')?.codigo).toBe('M');
  });

  it('apara espaços', () => {
    expect(acharVariante(lista, '  G  ')?.codigo).toBe('G');
  });

  it('devolve null para código ausente ou desconhecido', () => {
    expect(acharVariante(lista, null)).toBeNull();
    expect(acharVariante(lista, '')).toBeNull();
    expect(acharVariante(lista, 'XG')).toBeNull();
  });
});

describe('variantesSemArte', () => {
  it('lista só as que ainda não receberam imagem', () => {
    const lista = [variante({ codigo: 'P' }), COM_ARTE, SEM_ARTE];
    expect(variantesSemArte(lista).map((v) => v.codigo)).toEqual(['P', 'G']);
  });

  it('devolve vazio quando todas têm arte', () => {
    expect(variantesSemArte([COM_ARTE])).toEqual([]);
  });
});

describe('contarPorVariante', () => {
  const variantes = [
    variante({ codigo: 'P', posicao: 0 }),
    variante({ codigo: 'M', posicao: 1 }),
    variante({ codigo: 'G', posicao: 2 }),
  ];

  it('conta por tamanho, na ordem de exibição', () => {
    const convidados = [
      { variante: 'M' },
      { variante: 'P' },
      { variante: 'M' },
      { variante: 'G' },
    ];
    expect(contarPorVariante(convidados, variantes)).toEqual([
      { codigo: 'P', descricao: 'Fraldas tamanho P', total: 1 },
      { codigo: 'M', descricao: 'Fraldas tamanho M', total: 2 },
      { codigo: 'G', descricao: 'Fraldas tamanho G', total: 1 },
    ]);
  });

  it('agrupa à parte quem ainda não tem tamanho', () => {
    const contagem = contarPorVariante(
      [{ variante: 'P' }, { variante: null }, { variante: null }],
      variantes,
    );
    expect(contagem.at(-1)).toEqual({
      codigo: '',
      descricao: 'Sem tamanho definido',
      total: 2,
    });
  });

  it('não acrescenta a linha de pendentes quando todos têm tamanho', () => {
    const contagem = contarPorVariante([{ variante: 'P' }], variantes);
    expect(contagem.some((l) => l.codigo === '')).toBe(false);
  });

  it('trata código desconhecido como sem tamanho', () => {
    const contagem = contarPorVariante([{ variante: 'XG' }], variantes);
    expect(contagem.at(-1)?.total).toBe(1);
  });

  it('mostra zero nas variantes que ninguém recebeu', () => {
    const contagem = contarPorVariante([{ variante: 'P' }], variantes);
    expect(contagem.find((l) => l.codigo === 'G')?.total).toBe(0);
  });

  it('a soma das contagens bate com o total de convidados', () => {
    const convidados = [
      { variante: 'P' },
      { variante: 'M' },
      { variante: null },
      { variante: 'zzz' },
    ];
    const total = contarPorVariante(convidados, variantes).reduce(
      (soma, l) => soma + l.total,
      0,
    );
    expect(total).toBe(convidados.length);
  });

  it('aguenta lista vazia de convidados', () => {
    expect(contarPorVariante([], variantes).every((l) => l.total === 0)).toBe(true);
  });
});
