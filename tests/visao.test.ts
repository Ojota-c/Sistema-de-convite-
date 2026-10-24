import { describe, expect, it } from 'vitest';

import { PALETA_PADRAO } from '@/lib/paleta';
import {
  mensagemParaConvidado,
  montarLinha,
  montarLinhas,
  textoDaDataDoEvento,
  textoDoLocalDoEvento,
} from '@/lib/visao';
import { MENSAGEM_PADRAO } from '@/lib/whatsapp';
import type { Convidado, Evento } from '@/types/dominio';

const EVENTO: Evento = {
  titulo: 'Chá de Bebê do Antônio',
  inicio: new Date('2027-03-14T18:00:00.000Z'),
  fim: new Date('2027-03-14T21:00:00.000Z'),
  localNome: 'Casa da Vó',
  localEndereco: 'Rua das Acácias, 221',
  observacoes: 'Traga só a sua alegria.',
  mensagemConvite: null,
  caminhoDaImagem: 'convite-1.webp',
  tipoDaImagem: 'image/webp',
  larguraDaImagem: 1200,
  alturaDaImagem: 1600,
  paleta: PALETA_PADRAO,
  maxAcompanhantes: 3,
  fuso: 'America/Sao_Paulo',
  atualizadoEm: new Date('2027-01-10T12:00:00.000Z'),
};

const CONVIDADO: Convidado = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  nome: 'Ana Júlia',
  telefone: '5511988887777',
  token: 'bcdfghjkmnpq',
  primeiraAberturaEm: new Date('2027-02-01T15:00:00.000Z'),
  ultimaAberturaEm: new Date('2027-02-02T19:30:00.000Z'),
  totalDeAberturas: 3,
  confirmadoEm: new Date('2027-02-02T19:35:00.000Z'),
  recusadoEm: null,
  criadoEm: new Date('2027-01-15T12:00:00.000Z'),
  acompanhantes: [
    { id: 'a1', nome: 'Pedro', posicao: 0 },
    { id: 'a2', nome: 'Lia', posicao: 1 },
  ],
  status: 'confirmado',
  variante: 'P',
};

const BASE = 'https://exemplo.com';

describe('textoDaDataDoEvento', () => {
  it('junta a data por extenso com a faixa de horas', () => {
    expect(textoDaDataDoEvento(EVENTO)).toBe(
      'Domingo, 14 de março de 2027, das 15h às 18h',
    );
  });

  it('usa só o horário de início quando não há término', () => {
    expect(textoDaDataDoEvento({ ...EVENTO, fim: null })).toBe(
      'Domingo, 14 de março de 2027, às 15h',
    );
  });

  it('devolve vazio quando a data ainda não foi definida', () => {
    expect(textoDaDataDoEvento({ ...EVENTO, inicio: null })).toBe('');
  });
});

describe('textoDoLocalDoEvento', () => {
  it('junta nome e endereço', () => {
    expect(textoDoLocalDoEvento(EVENTO)).toBe('Casa da Vó - Rua das Acácias, 221');
  });

  it('devolve vazio sem local', () => {
    expect(
      textoDoLocalDoEvento({ ...EVENTO, localNome: null, localEndereco: null }),
    ).toBe('');
  });
});

describe('mensagemParaConvidado', () => {
  const link = `${BASE}/c/bcdfghjkmnpq`;

  it('usa o texto padrão quando não há mensagem salva', () => {
    const mensagem = mensagemParaConvidado(EVENTO, 'Ana Júlia', link);
    expect(mensagem).toContain('Ana Júlia');
    expect(mensagem).toContain('Chá de Bebê do Antônio');
    expect(mensagem).toContain(link);
  });

  it('usa a mensagem escrita pelo organizador', () => {
    const mensagem = mensagemParaConvidado(
      { ...EVENTO, mensagemConvite: 'Oi {nome}, vem no {evento}? {link}' },
      'Bruno',
      link,
    );
    expect(mensagem).toBe(`Oi Bruno, vem no Chá de Bebê do Antônio? ${link}`);
  });

  it('não deixa marcador nenhum para trás', () => {
    expect(mensagemParaConvidado(EVENTO, 'Ana', link)).not.toMatch(/\{[a-z]+\}/);
  });

  it('não quebra com nome que tem cifrão', () => {
    expect(mensagemParaConvidado(EVENTO, 'Ana $& Silva', link)).toContain(
      'Ana $& Silva',
    );
  });

  it('inclui data e local na mensagem padrão', () => {
    const mensagem = mensagemParaConvidado(EVENTO, 'Ana', link);
    expect(mensagem).toContain('14 de março de 2027');
    expect(mensagem).toContain('Casa da Vó');
  });

  it('não deixa linha vazia quando o evento ainda não tem local', () => {
    const semLocal = { ...EVENTO, localNome: null, localEndereco: null };
    const mensagem = mensagemParaConvidado(semLocal, 'Ana', link);
    expect(mensagem).not.toMatch(/\n\n\n/);
    expect(MENSAGEM_PADRAO).toContain('{local}');
  });
});

describe('montarLinha', () => {
  it('monta o link pessoal do convidado', () => {
    expect(montarLinha(CONVIDADO, EVENTO, BASE).link).toBe(
      'https://exemplo.com/c/bcdfghjkmnpq',
    );
  });

  it('monta o link do WhatsApp já direcionado ao número', () => {
    const linha = montarLinha(CONVIDADO, EVENTO, BASE);
    const url = new URL(linha.linkWhatsApp);

    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe('/5511988887777');
    expect(url.searchParams.get('text')).toBe(linha.mensagem);
  });

  it('abre o seletor de contato quando o convidado não tem telefone', () => {
    const linha = montarLinha({ ...CONVIDADO, telefone: null }, EVENTO, BASE);
    expect(new URL(linha.linkWhatsApp).pathname).toBe('/');
  });

  it('conta o convidado mais os acompanhantes', () => {
    expect(montarLinha(CONVIDADO, EVENTO, BASE).totalDePessoas).toBe(3);
  });

  it('zera o total de pessoas de quem não confirmou', () => {
    const pendente = { ...CONVIDADO, confirmadoEm: null, status: 'sem-resposta' as const };
    expect(montarLinha(pendente, EVENTO, BASE).totalDePessoas).toBe(0);
  });

  it('formata as datas no fuso do evento', () => {
    const linha = montarLinha(CONVIDADO, EVENTO, BASE);
    expect(linha.primeiraAberturaTexto).toBe('01/02/2027 às 12:00');
    expect(linha.ultimaAberturaTexto).toBe('02/02/2027 às 16:30');
    expect(linha.respostaTexto).toBe('02/02/2027 às 16:35');
  });

  it('deixa as datas nulas quando nada aconteceu', () => {
    const novo: Convidado = {
      ...CONVIDADO,
      primeiraAberturaEm: null,
      ultimaAberturaEm: null,
      confirmadoEm: null,
      recusadoEm: null,
      status: 'nao-abriu',
    };
    const linha = montarLinha(novo, EVENTO, BASE);

    expect(linha.primeiraAberturaTexto).toBeNull();
    expect(linha.ultimaAberturaTexto).toBeNull();
    expect(linha.respostaTexto).toBeNull();
  });

  it('usa a data de recusa como data de resposta', () => {
    const recusou: Convidado = {
      ...CONVIDADO,
      confirmadoEm: null,
      recusadoEm: new Date('2027-02-03T13:00:00.000Z'),
      status: 'recusado',
    };
    expect(montarLinha(recusou, EVENTO, BASE).respostaTexto).toBe(
      '03/02/2027 às 10:00',
    );
  });

  it('leva os nomes dos acompanhantes como texto simples', () => {
    expect(montarLinha(CONVIDADO, EVENTO, BASE).acompanhantes).toEqual([
      'Pedro',
      'Lia',
    ]);
  });

  it('não devolve nenhum objeto Date, que não atravessa bem para o cliente', () => {
    for (const valor of Object.values(montarLinha(CONVIDADO, EVENTO, BASE))) {
      expect(valor).not.toBeInstanceOf(Date);
    }
  });
});

describe('montarLinhas', () => {
  it('preserva a ordem recebida', () => {
    const outro: Convidado = { ...CONVIDADO, id: 'outro', nome: 'Bruno', token: 'qpnmkjhgfdcb' };
    const linhas = montarLinhas([CONVIDADO, outro], EVENTO, BASE);

    expect(linhas.map((l) => l.nome)).toEqual(['Ana Júlia', 'Bruno']);
    expect(linhas[1]?.link).toBe('https://exemplo.com/c/qpnmkjhgfdcb');
  });

  it('aguenta lista vazia', () => {
    expect(montarLinhas([], EVENTO, BASE)).toEqual([]);
  });
});
