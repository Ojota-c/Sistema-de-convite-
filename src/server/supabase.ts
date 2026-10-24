import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/db';

import { ambiente } from './ambiente';

/**
 * Cliente unico do Supabase, com a service role key.
 *
 * Este arquivo importa 'server-only': se algum componente de cliente tentar
 * importa-lo, o build quebra na hora em vez de vazar a chave para o navegador.
 *
 * A service role ignora RLS. Como nenhuma tabela tem policy, ela e o unico
 * caminho de acesso ao banco, e ele so existe dentro do servidor.
 */

let cliente: SupabaseClient<Database> | null = null;

export function supabase(): SupabaseClient<Database> {
  if (cliente) return cliente;

  const env = ambiente();
  cliente = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-client-info': 'convite-cha-de-bebe' },
    },
  });

  return cliente;
}

/** Nome do bucket onde mora a imagem do convite. */
export function balde(): string {
  return ambiente().SUPABASE_STORAGE_BUCKET;
}
