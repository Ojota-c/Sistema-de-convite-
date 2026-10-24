import { readFileSync, existsSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Repete localmente o secrets scanning da Netlify.
 *
 * A Netlify procura o valor de cada variavel de ambiente dentro do resultado
 * do build e falha o deploy se encontrar algum. Rodar a mesma busca aqui
 * evita descobrir o problema so depois de esperar o deploy inteiro.
 *
 * As chaves listadas em IGNORADAS sao as mesmas de SECRETS_SCAN_OMIT_KEYS no
 * netlify.toml, e os dois lugares precisam concordar.
 */

const PASTA_DO_BUILD = '.next';
const ARQUIVO_DE_AMBIENTE = '.env.local';

/** Publicas por natureza, ou palavras comuns demais para servirem de alarme. */
const IGNORADAS = new Set(['NEXT_PUBLIC_SITE_URL', 'SUPABASE_STORAGE_BUCKET']);

/** Valores curtos dariam falso positivo em qualquer lugar. */
const TAMANHO_MINIMO = 12;

if (!existsSync(ARQUIVO_DE_AMBIENTE)) {
  console.log(`  ${ARQUIVO_DE_AMBIENTE} não existe, nada a verificar.`);
  process.exit(0);
}

if (!existsSync(PASTA_DO_BUILD)) {
  console.log(`  ${PASTA_DO_BUILD} não existe. Rode o build antes.`);
  process.exit(0);
}

const ambiente = new Map();
for (const linha of readFileSync(ARQUIVO_DE_AMBIENTE, 'utf8').split('\n')) {
  if (!linha.includes('=') || linha.trimStart().startsWith('#')) continue;
  const corte = linha.indexOf('=');
  const chave = linha.slice(0, corte).trim();
  const valor = linha.slice(corte + 1).trim();
  if (valor.length >= TAMANHO_MINIMO && !IGNORADAS.has(chave)) {
    ambiente.set(chave, valor);
  }
}

function todosOsArquivos(pasta) {
  const encontrados = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    const info = statSync(caminho);
    if (info.isDirectory()) encontrados.push(...todosOsArquivos(caminho));
    else encontrados.push(caminho);
  }
  return encontrados;
}

const arquivos = todosOsArquivos(PASTA_DO_BUILD);
const vazamentos = [];

for (const [chave, valor] of ambiente) {
  const agulha = Buffer.from(valor);
  for (const caminho of arquivos) {
    let conteudo;
    try {
      conteudo = readFileSync(caminho);
    } catch {
      continue;
    }
    if (conteudo.includes(agulha)) {
      vazamentos.push({ chave, caminho });
      break;
    }
  }
}

console.log(
  `  ${ambiente.size} segredos conferidos contra ${arquivos.length} arquivos de ${PASTA_DO_BUILD}`,
);
console.log(`  ignorados de propósito: ${[...IGNORADAS].join(', ')}`);

if (vazamentos.length > 0) {
  console.error('\n  VAZAMENTO no resultado do build:');
  for (const { chave, caminho } of vazamentos) {
    console.error(`    ${chave} aparece em ${caminho}`);
  }
  console.error('\n  A Netlify vai recusar este deploy, e com razão.');
  process.exit(1);
}

console.log('  nenhum segredo no resultado do build.');
