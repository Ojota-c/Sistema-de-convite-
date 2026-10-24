import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Guarda da regra das Server Actions.
 *
 * Um arquivo marcado com 'use server' so pode exportar funcoes assincronas.
 * Exportar uma constante, nem que seja um objeto bobo de estado inicial,
 * derruba a pagina em tempo de execucao com a mensagem
 * "A 'use server' file can only export async functions".
 *
 * O detalhe cruel e que `next build` passa assim mesmo: o erro so aparece
 * quando alguem abre a pagina. Este teste existe justamente para pegar isso
 * antes, no `npm run verificar`.
 *
 * Exportar `type` e permitido, porque tipo some na compilacao.
 */

const RAIZ = 'src';

/** Percorre src/ e devolve todo arquivo .ts ou .tsx. */
function listarArquivos(pasta: string): string[] {
  const achados: string[] = [];

  for (const item of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) {
      achados.push(...listarArquivos(caminho));
    } else if (/\.tsx?$/.test(item.name)) {
      achados.push(caminho);
    }
  }

  return achados;
}

function ehArquivoDeServerAction(conteudo: string): boolean {
  const primeiraLinha = conteudo.split('\n', 1)[0]?.trim() ?? '';
  return primeiraLinha === "'use server';" || primeiraLinha === '"use server";';
}

/** Exportacoes de valor, ou seja, tudo menos `export type` e `export interface`. */
function exportacoesDeValor(conteudo: string): { linha: number; texto: string }[] {
  return conteudo
    .split('\n')
    .map((texto, indice) => ({ linha: indice + 1, texto: texto.trimEnd() }))
    .filter(({ texto }) => /^export\b/.test(texto))
    .filter(({ texto }) => !/^export\s+(type|interface)\b/.test(texto))
    .filter(({ texto }) => !/^export\s*\{[^}]*\}\s*from/.test(texto));
}

const arquivosDeAction = listarArquivos(RAIZ)
  .map((caminho) => ({ caminho, conteudo: readFileSync(caminho, 'utf8') }))
  .filter(({ conteudo }) => ehArquivoDeServerAction(conteudo));

describe("arquivos marcados com 'use server'", () => {
  it('existem no projeto, senao este teste nao estaria guardando nada', () => {
    expect(arquivosDeAction.length).toBeGreaterThan(0);
  });

  it.each(arquivosDeAction.map(({ caminho }) => caminho))(
    '%s exporta apenas funcoes assincronas',
    (caminho) => {
      const arquivo = arquivosDeAction.find((a) => a.caminho === caminho);
      expect(arquivo).toBeDefined();

      const proibidas = exportacoesDeValor(arquivo!.conteudo).filter(
        ({ texto }) => !/^export\s+async\s+function\b/.test(texto),
      );

      const descricao = proibidas
        .map(({ linha, texto }) => `${caminho}:${linha}  ${texto}`)
        .join('\n');

      expect(
        proibidas,
        `Exportação que não é função assíncrona em um arquivo 'use server'.\n` +
          `Mova a constante ou o tipo para um módulo comum, como src/types/dominio.ts.\n${descricao}`,
      ).toEqual([]);
    },
  );
});

describe('detector do proprio teste', () => {
  it('reconhece a diretiva na primeira linha', () => {
    expect(ehArquivoDeServerAction("'use server';\n\nexport async function a() {}")).toBe(
      true,
    );
    expect(ehArquivoDeServerAction('"use server";\n')).toBe(true);
    expect(ehArquivoDeServerAction("'use client';\n")).toBe(false);
    expect(ehArquivoDeServerAction('// comentario\n')).toBe(false);
  });

  it('acusa uma exportacao de constante', () => {
    const ruim = "'use server';\nexport const X = { a: 1 };\n";
    const encontradas = exportacoesDeValor(ruim).filter(
      ({ texto }) => !/^export\s+async\s+function\b/.test(texto),
    );
    expect(encontradas).toHaveLength(1);
  });

  it('aceita funcao assincrona e deixa passar export type', () => {
    const bom = "'use server';\nexport type T = string;\nexport async function f() {}\n";
    const encontradas = exportacoesDeValor(bom).filter(
      ({ texto }) => !/^export\s+async\s+function\b/.test(texto),
    );
    expect(encontradas).toEqual([]);
  });

  it('acusa funcao exportada sem async', () => {
    const ruim = "'use server';\nexport function f() {}\n";
    const encontradas = exportacoesDeValor(ruim).filter(
      ({ texto }) => !/^export\s+async\s+function\b/.test(texto),
    );
    expect(encontradas).toHaveLength(1);
  });
});
