import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Junta as migrations em um arquivo so, para a primeira instalacao exigir uma
 * colagem em vez de tres. Gerado, nunca editado a mao: rode `npm run sql`
 * depois de mexer em qualquer migration.
 */
const PASTA = 'supabase/migrations';
const DESTINO = 'supabase/aplicar-tudo.sql';

const arquivos = readdirSync(PASTA)
  .filter((nome) => nome.endsWith('.sql'))
  .sort();

const cabecalho = `-- =============================================================================
-- aplicar-tudo.sql
--
-- ARQUIVO GERADO. Nao edite aqui: mexa nos arquivos de supabase/migrations/
-- e rode \`npm run sql\` para regerar.
--
-- Junta ${arquivos.length} migrations em uma colagem so, para a primeira
-- instalacao ser mais rapida:
${arquivos.map((n) => `--   - ${n}`).join('\n')}
--
-- Como aplicar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Pode rodar mais de uma vez sem estragar nada.
-- =============================================================================

`;

const corpo = arquivos
  .map((nome) => readFileSync(join(PASTA, nome), 'utf8').trimEnd())
  .join('\n\n\n');

writeFileSync(DESTINO, `${cabecalho}${corpo}\n`, 'utf8');
console.log(`${DESTINO} gerado a partir de ${arquivos.length} migrations.`);
