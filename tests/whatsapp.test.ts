import { describe, expect, it } from 'vitest';

import {
  MENSAGEM_PADRAO,
  aplicarModelo,
  formatarTelefone,
  linkDoConvite,
  linkWhatsApp,
} from '@/lib/whatsapp';

const DADOS = {
  nome: 'Maria',
  evento: 'Chá de Bebê do Antônio',
  data: 'Domingo, 14 de março de 2027, às 15h',
  local: 'Casa da Vó - Rua das Acácias, 221',
  link: 'https://exemplo.com/c/bcdfghjkmnpq',
};

describe('aplicarModelo', () => {
  it('troca todos os marcadores', () => {
    const texto = aplicarModelo(MENSAGEM_PADRAO, DADOS);
    expect(texto).toContain('Maria');
    expect(texto).toContain('Chá de Bebê do Antônio');
    expect(texto).toContain('https://exemplo.com/c/bcdfghjkmnpq');
    expect(texto).not.toContain('{');
  });

  it('troca o mesmo marcador mais de uma vez', () => {
    const texto = aplicarModelo('{nome}, oi {nome}!', DADOS);
    expect(texto).toBe('Maria, oi Maria!');
  });

  it('nao se perde com nome que tem caractere especial', () => {
    const texto = aplicarModelo('Oi, {nome}!', { ...DADOS, nome: 'Ana $& (mãe)' });
    expect(texto).toBe('Oi, Ana $& (mãe)!');
  });

  it('nao deixa linha solta quando um valor vem vazio', () => {
    const texto = aplicarModelo('{evento}\n{local}\n{link}', {
      ...DADOS,
      local: '',
    });
    expect(texto).toBe('Chá de Bebê do Antônio\n\nhttps://exemplo.com/c/bcdfghjkmnpq');
  });

  it('reduz excesso de linhas em branco', () => {
    expect(aplicarModelo('a\n\n\n\n\nb', DADOS)).toBe('a\n\nb');
  });

  it('apara as pontas', () => {
    expect(aplicarModelo('\n\n  Oi  \n\n', DADOS)).toBe('Oi');
  });

  it('devolve o modelo intacto quando nao ha marcador', () => {
    expect(aplicarModelo('Mensagem fixa.', DADOS)).toBe('Mensagem fixa.');
  });
});

describe('MENSAGEM_PADRAO', () => {
  it('usa apenas marcadores conhecidos', () => {
    const encontrados = MENSAGEM_PADRAO.match(/\{[a-z]+\}/g) ?? [];
    for (const marcador of encontrados) {
      expect(['{nome}', '{evento}', '{data}', '{local}', '{link}']).toContain(marcador);
    }
  });

  it('inclui o nome e o link', () => {
    expect(MENSAGEM_PADRAO).toContain('{nome}');
    expect(MENSAGEM_PADRAO).toContain('{link}');
  });
});

describe('linkDoConvite', () => {
  it('monta a URL do convidado', () => {
    expect(linkDoConvite('https://exemplo.com', 'bcdfghjkmnpq')).toBe(
      'https://exemplo.com/c/bcdfghjkmnpq',
    );
  });

  it('nao duplica a barra final da base', () => {
    expect(linkDoConvite('https://exemplo.com/', 'abc')).toBe(
      'https://exemplo.com/c/abc',
    );
    expect(linkDoConvite('https://exemplo.com///', 'abc')).toBe(
      'https://exemplo.com/c/abc',
    );
  });

  it('apara espacos da base', () => {
    expect(linkDoConvite('  https://exemplo.com  ', 'abc')).toBe(
      'https://exemplo.com/c/abc',
    );
  });
});

describe('linkWhatsApp', () => {
  it('aponta para a conversa quando ha telefone', () => {
    const url = new URL(linkWhatsApp('5511988887777', 'Oi!'));
    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe('/5511988887777');
    expect(url.searchParams.get('text')).toBe('Oi!');
  });

  it('abre o seletor de contato quando nao ha telefone', () => {
    const url = new URL(linkWhatsApp(null, 'Oi!'));
    expect(url.pathname).toBe('/');
    expect(url.searchParams.get('text')).toBe('Oi!');
  });

  it('ignora a formatacao do telefone', () => {
    expect(linkWhatsApp('+55 (11) 98888-7777', 'Oi')).toContain('wa.me/5511988887777');
  });

  it('trata telefone curto demais como ausente', () => {
    expect(linkWhatsApp('123', 'Oi')).toContain('wa.me/?text=');
  });

  it('codifica quebra de linha e acento no texto', () => {
    const url = linkWhatsApp(null, 'Oi, Maria!\nVocê vem?');
    expect(url).toContain('%0A');
    expect(url).not.toContain('\n');
    expect(new URL(url).searchParams.get('text')).toBe('Oi, Maria!\nVocê vem?');
  });

  it('preserva a mensagem inteira na ida e volta', () => {
    const texto = aplicarModelo(MENSAGEM_PADRAO, DADOS);
    expect(new URL(linkWhatsApp('5511988887777', texto)).searchParams.get('text')).toBe(
      texto,
    );
  });
});

describe('formatarTelefone', () => {
  it('formata celular brasileiro', () => {
    expect(formatarTelefone('5511988887777')).toBe('(11) 98888-7777');
  });

  it('formata fixo brasileiro', () => {
    expect(formatarTelefone('551133334444')).toBe('(11) 3333-4444');
  });

  it('mostra numero internacional com o mais', () => {
    expect(formatarTelefone('351912345678')).toBe('+351912345678');
  });

  it('devolve null quando nao ha numero', () => {
    expect(formatarTelefone(null)).toBeNull();
    expect(formatarTelefone('')).toBeNull();
    expect(formatarTelefone('sem numero')).toBeNull();
  });
});
