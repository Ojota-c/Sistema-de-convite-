import { describe, expect, it } from 'vitest';

import { descricaoDoEvento, linkGoogleAgenda, localCompleto } from '@/lib/calendario';

const INICIO = new Date('2027-03-14T18:00:00.000Z');
const FIM = new Date('2027-03-14T21:00:00.000Z');

function parametros(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

describe('linkGoogleAgenda', () => {
  const base = {
    titulo: 'Chá de Bebê do Antônio',
    inicio: INICIO,
    fim: FIM,
    descricao: 'Traga só a sua alegria.',
    local: 'Casa da Vó - Rua das Acácias, 221',
  };

  it('aponta para o endereco de criacao de evento do Google', () => {
    const url = new URL(linkGoogleAgenda(base));
    expect(url.origin).toBe('https://calendar.google.com');
    expect(url.pathname).toBe('/calendar/render');
  });

  it('usa a acao TEMPLATE', () => {
    expect(parametros(linkGoogleAgenda(base)).get('action')).toBe('TEMPLATE');
  });

  it('monta o intervalo em UTC separado por barra', () => {
    expect(parametros(linkGoogleAgenda(base)).get('dates')).toBe(
      '20270314T180000Z/20270314T210000Z',
    );
  });

  it('leva titulo, descricao e local sem escapar demais', () => {
    const p = parametros(linkGoogleAgenda(base));
    expect(p.get('text')).toBe('Chá de Bebê do Antônio');
    expect(p.get('details')).toBe('Traga só a sua alegria.');
    expect(p.get('location')).toBe('Casa da Vó - Rua das Acácias, 221');
  });

  it('codifica os acentos na URL, para o link sobreviver ao WhatsApp', () => {
    const url = linkGoogleAgenda(base);
    expect(url).not.toContain('á');
    expect(url).toContain('%');
  });

  it('assume tres horas quando nao ha termino', () => {
    const p = parametros(linkGoogleAgenda({ ...base, fim: null }));
    expect(p.get('dates')).toBe('20270314T180000Z/20270314T210000Z');
  });

  it('ignora um termino anterior ao inicio', () => {
    const p = parametros(
      linkGoogleAgenda({ ...base, fim: new Date('2027-03-14T10:00:00.000Z') }),
    );
    expect(p.get('dates')).toBe('20270314T180000Z/20270314T210000Z');
  });

  it('omite descricao e local vazios', () => {
    const p = parametros(
      linkGoogleAgenda({ ...base, descricao: '   ', local: null }),
    );
    expect(p.has('details')).toBe(false);
    expect(p.has('location')).toBe(false);
  });

  it('recusa um inicio invalido', () => {
    expect(() =>
      linkGoogleAgenda({ ...base, inicio: new Date('nao e data') }),
    ).toThrow();
  });
});

describe('descricaoDoEvento', () => {
  it('junta observacoes, endereco e link em linhas', () => {
    expect(
      descricaoDoEvento({
        observacoes: 'Traga só a sua alegria.',
        endereco: 'Rua das Acácias, 221',
        linkDoConvite: 'https://exemplo.com/c/abc',
      }),
    ).toBe(
      'Traga só a sua alegria.\nEndereço: Rua das Acácias, 221\nConvite: https://exemplo.com/c/abc',
    );
  });

  it('pula as partes ausentes', () => {
    expect(descricaoDoEvento({ linkDoConvite: 'https://exemplo.com/c/abc' })).toBe(
      'Convite: https://exemplo.com/c/abc',
    );
  });

  it('devolve string vazia quando nao ha nada', () => {
    expect(descricaoDoEvento({})).toBe('');
    expect(
      descricaoDoEvento({ observacoes: '  ', endereco: null, linkDoConvite: '' }),
    ).toBe('');
  });
});

describe('localCompleto', () => {
  it('junta nome e endereco', () => {
    expect(localCompleto('Casa da Vó', 'Rua das Acácias, 221')).toBe(
      'Casa da Vó - Rua das Acácias, 221',
    );
  });

  it('usa so o que existe', () => {
    expect(localCompleto('Casa da Vó', null)).toBe('Casa da Vó');
    expect(localCompleto(null, 'Rua das Acácias, 221')).toBe('Rua das Acácias, 221');
  });

  it('devolve null quando nao ha local', () => {
    expect(localCompleto(null, null)).toBeNull();
    expect(localCompleto('  ', '')).toBeNull();
  });
});
