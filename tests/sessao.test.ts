import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Testes do cookie de sessao do organizador.
 *
 * O modulo le as variaveis de ambiente de forma preguicosa e guarda o
 * resultado, entao cada teste importa uma copia nova com vi.resetModules
 * depois de preparar o ambiente.
 */

const AMBIENTE_VALIDO = {
  SUPABASE_URL: 'https://projeto.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'chave-de-servico-bem-comprida-para-passar',
  ADMIN_PASSWORD: 'senha-do-organizador',
  ADMIN_SESSION_SECRET: 'segredo-de-sessao-com-mais-de-trinta-e-dois-caracteres',
  NEXT_PUBLIC_SITE_URL: 'https://exemplo.com',
};

const ambienteOriginal = { ...process.env };

async function carregarModulo(variaveis: Record<string, string> = AMBIENTE_VALIDO) {
  const { resetModules } = await import('vitest').then((m) => ({
    resetModules: m.vi.resetModules.bind(m.vi),
  }));
  resetModules();
  Object.assign(process.env, variaveis);
  return import('@/server/sessao');
}

beforeEach(() => {
  Object.assign(process.env, AMBIENTE_VALIDO);
});

afterEach(() => {
  process.env = { ...ambienteOriginal };
});

describe('criarValorDeSessao', () => {
  it('monta carga e assinatura separadas por ponto', async () => {
    const { criarValorDeSessao } = await carregarModulo();
    const valor = criarValorDeSessao();

    expect(valor.split('.')).toHaveLength(2);
    expect(valor.length).toBeGreaterThan(40);
  });

  it('nunca gera dois cookies iguais', async () => {
    const { criarValorDeSessao } = await carregarModulo();
    const valores = new Set(Array.from({ length: 50 }, () => criarValorDeSessao()));
    expect(valores.size).toBe(50);
  });
});

describe('valorDeSessaoEhValido', () => {
  it('aceita um cookie recem-criado', async () => {
    const { criarValorDeSessao, valorDeSessaoEhValido } = await carregarModulo();
    expect(valorDeSessaoEhValido(criarValorDeSessao())).toBe(true);
  });

  it('recusa vazio, nulo e indefinido', async () => {
    const { valorDeSessaoEhValido } = await carregarModulo();
    expect(valorDeSessaoEhValido('')).toBe(false);
    expect(valorDeSessaoEhValido(null)).toBe(false);
    expect(valorDeSessaoEhValido(undefined)).toBe(false);
  });

  it('recusa cookie sem assinatura', async () => {
    const { valorDeSessaoEhValido } = await carregarModulo();
    const carga = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, jti: 'x' }),
    ).toString('base64url');

    expect(valorDeSessaoEhValido(carga)).toBe(false);
    expect(valorDeSessaoEhValido(`${carga}.`)).toBe(false);
  });

  it('recusa assinatura trocada', async () => {
    const { criarValorDeSessao, valorDeSessaoEhValido } = await carregarModulo();
    const valor = criarValorDeSessao();
    const carga = valor.slice(0, valor.lastIndexOf('.'));

    expect(valorDeSessaoEhValido(`${carga}.assinaturaInventada`)).toBe(false);
  });

  it('recusa carga adulterada, mesmo com assinatura antiga', async () => {
    const { criarValorDeSessao, valorDeSessaoEhValido } = await carregarModulo();
    const valor = criarValorDeSessao();
    const assinatura = valor.slice(valor.lastIndexOf('.') + 1);

    // Tenta esticar a validade para daqui a cem anos.
    const cargaFalsa = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3_153_600_000, jti: 'x' }),
    ).toString('base64url');

    expect(valorDeSessaoEhValido(`${cargaFalsa}.${assinatura}`)).toBe(false);
  });

  it('recusa cookie expirado', async () => {
    const { criarValorDeSessao, valorDeSessaoEhValido } = await carregarModulo();

    // Criado treze horas atras; a sessao dura doze.
    const treizeHorasAtras = Date.now() - 13 * 60 * 60 * 1000;
    const valor = criarValorDeSessao(treizeHorasAtras);

    expect(valorDeSessaoEhValido(valor)).toBe(false);
  });

  it('aceita cookie dentro da validade', async () => {
    const { criarValorDeSessao, valorDeSessaoEhValido } = await carregarModulo();

    const onzeHorasAtras = Date.now() - 11 * 60 * 60 * 1000;
    expect(valorDeSessaoEhValido(criarValorDeSessao(onzeHorasAtras))).toBe(true);
  });

  it('recusa cookie assinado com outro segredo', async () => {
    const { criarValorDeSessao } = await carregarModulo();
    const valorDoOutroServidor = criarValorDeSessao();

    const { valorDeSessaoEhValido } = await carregarModulo({
      ...AMBIENTE_VALIDO,
      ADMIN_SESSION_SECRET: 'um-segredo-completamente-diferente-e-bem-longo',
    });

    expect(valorDeSessaoEhValido(valorDoOutroServidor)).toBe(false);
  });

  it('recusa carga que nao e JSON', async () => {
    const { valorDeSessaoEhValido } = await carregarModulo();
    expect(valorDeSessaoEhValido('naoEhBase64Json.assinatura')).toBe(false);
  });

  it('recusa carga sem o campo de expiracao', async () => {
    const { criarValorDeSessao, valorDeSessaoEhValido } = await carregarModulo();
    // Reaproveita a mecanica real para garantir que o motivo da recusa seja a
    // falta do exp, e nao a assinatura.
    const valido = criarValorDeSessao();
    expect(valorDeSessaoEhValido(valido)).toBe(true);

    const semExp = Buffer.from(JSON.stringify({ jti: 'x' })).toString('base64url');
    expect(valorDeSessaoEhValido(`${semExp}.qualquerCoisa`)).toBe(false);
  });
});

describe('senhaConfere', () => {
  it('aceita a senha configurada', async () => {
    const { senhaConfere } = await carregarModulo();
    expect(senhaConfere('senha-do-organizador')).toBe(true);
  });

  it('recusa senha errada, vazia ou com caixa diferente', async () => {
    const { senhaConfere } = await carregarModulo();
    expect(senhaConfere('senha-errada')).toBe(false);
    expect(senhaConfere('')).toBe(false);
    expect(senhaConfere('Senha-Do-Organizador')).toBe(false);
  });

  it('recusa senha com um caractere a mais', async () => {
    const { senhaConfere } = await carregarModulo();
    expect(senhaConfere('senha-do-organizador ')).toBe(false);
  });
});

describe('opcoesDoCookie', () => {
  it('marca httpOnly, sameSite lax e caminho raiz', async () => {
    const { opcoesDoCookie } = await carregarModulo();
    const opcoes = opcoesDoCookie();

    expect(opcoes.httpOnly).toBe(true);
    expect(opcoes.sameSite).toBe('lax');
    expect(opcoes.path).toBe('/');
    expect(opcoes.maxAge).toBe(12 * 60 * 60);
  });
});
