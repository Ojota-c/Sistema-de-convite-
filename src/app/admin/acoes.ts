'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { lerPaleta } from '@/lib/paleta';
import {
  TAMANHO_MAXIMO_IMAGEM,
  TIPOS_DE_IMAGEM,
  codigoDeVarianteSchema,
  edicaoConvidadoSchema,
  eventoSchema,
  idConvidadoSchema,
  loteSchema,
  novoConvidadoSchema,
  paletaSchema,
  primeiroErro,
} from '@/lib/validacao';
import type { EstadoDeFormulario } from '@/types/dominio';
import {
  atualizarConvidado,
  criarConvidado,
  criarConvidadosEmLote,
  definirVariante,
  definirVarianteDosSemVariante,
  removerConvidado,
} from '@/server/convidados';
import {
  removerImagemDoConvite,
  salvarEvento,
  salvarImagemDoConvite,
} from '@/server/evento';
import { encerrarSessao, temSessao } from '@/server/sessao';
import {
  removerImagemDaVariante,
  salvarImagemDaVariante,
} from '@/server/variantes';

/**
 * Acoes do painel.
 *
 * Cada uma confere a sessao por conta propria, no servidor. O proxy.ts cuida
 * so do redirecionamento das paginas: uma Server Action pode ser chamada
 * diretamente, sem passar por navegacao nenhuma, e por isso nunca confia na
 * barreira anterior.
 */

const SEM_SESSAO: EstadoDeFormulario = {
  estado: 'erro',
  mensagem: 'Sua sessão expirou. Entre de novo para continuar.',
};

function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === 'string' ? valor : '';
}

function erro(mensagem: string): EstadoDeFormulario {
  return { estado: 'erro', mensagem };
}

function sucesso(mensagem?: string): EstadoDeFormulario {
  return mensagem === undefined ? { estado: 'sucesso' } : { estado: 'sucesso', mensagem };
}

function atualizarPainel(): void {
  revalidatePath('/admin');
  revalidatePath('/admin/convite');
  revalidatePath('/admin/convidados');
}

// ---------------------------------------------------------------------------
// Evento
// ---------------------------------------------------------------------------
/**
 * Le e confere os campos de uma imagem enviada pelo painel.
 * Compartilhado pela arte geral do evento e pelas artes das variantes, para
 * as duas aplicarem exatamente as mesmas regras.
 */
async function lerImagemDoFormulario(formData: FormData):
  Promise<
    | { ok: true; bytes: ArrayBuffer; tipo: string; largura: number; altura: number; paleta: ReturnType<typeof lerPaleta> }
    | { ok: false; mensagem: string }
  > {
  const arquivo = formData.get('arquivo');
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, mensagem: 'Escolha uma imagem para enviar.' };
  }
  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {
    return { ok: false, mensagem: 'A imagem passou de 5 MB mesmo depois de comprimida.' };
  }

  const tipo = arquivo.type;
  if (!TIPOS_DE_IMAGEM.includes(tipo as (typeof TIPOS_DE_IMAGEM)[number])) {
    return { ok: false, mensagem: 'Formato não aceito. Envie JPG, PNG ou WebP.' };
  }

  const largura = Number(texto(formData, 'largura'));
  const altura = Number(texto(formData, 'altura'));
  if (!Number.isInteger(largura) || !Number.isInteger(altura) || largura < 1 || altura < 1) {
    return { ok: false, mensagem: 'Não conseguimos ler as dimensões da imagem.' };
  }

  let paletaBruta: unknown;
  try {
    paletaBruta = JSON.parse(texto(formData, 'paleta'));
  } catch {
    return { ok: false, mensagem: 'Não conseguimos ler as cores da imagem.' };
  }

  const validacao = paletaSchema.safeParse(paletaBruta);
  if (!validacao.success) {
    return { ok: false, mensagem: 'As cores extraídas da imagem vieram em formato inesperado.' };
  }

  return {
    ok: true,
    bytes: await arquivo.arrayBuffer(),
    tipo,
    largura,
    altura,
    paleta: lerPaleta(validacao.data),
  };
}


export async function salvarEventoAction(
  _anterior: EstadoDeFormulario,
  formData: FormData,
): Promise<EstadoDeFormulario> {
  if (!(await temSessao())) return SEM_SESSAO;

  const validacao = eventoSchema.safeParse({
    titulo: texto(formData, 'titulo'),
    inicio: texto(formData, 'inicio'),
    fim: texto(formData, 'fim') || null,
    localNome: texto(formData, 'localNome'),
    localEndereco: texto(formData, 'localEndereco'),
    observacoes: texto(formData, 'observacoes'),
    mensagemConvite: texto(formData, 'mensagemConvite'),
    maxAcompanhantes: texto(formData, 'maxAcompanhantes'),
  });

  if (!validacao.success) {
    return erro(primeiroErro(validacao.error));
  }

  try {
    await salvarEvento(validacao.data);
  } catch (falha) {
    return erro(falha instanceof Error ? falha.message : 'Não foi possível salvar.');
  }

  atualizarPainel();
  return sucesso('Convite salvo.');
}

export async function salvarImagemAction(
  _anterior: EstadoDeFormulario,
  formData: FormData,
): Promise<EstadoDeFormulario> {
  if (!(await temSessao())) return SEM_SESSAO;

  const imagem = await lerImagemDoFormulario(formData);
  if (!imagem.ok) return erro(imagem.mensagem);

  try {
    await salvarImagemDoConvite({
      bytes: imagem.bytes,
      tipo: imagem.tipo,
      largura: imagem.largura,
      altura: imagem.altura,
      paleta: imagem.paleta,
    });
  } catch (falha) {
    return erro(
      falha instanceof Error ? falha.message : 'Não foi possível enviar a imagem.',
    );
  }

  atualizarPainel();
  return sucesso('Imagem do convite atualizada.');
}

export async function removerImagemAction(
  _anterior: EstadoDeFormulario,
  _formData: FormData,
): Promise<EstadoDeFormulario> {
  if (!(await temSessao())) return SEM_SESSAO;

  try {
    await removerImagemDoConvite();
  } catch (falha) {
    return erro(
      falha instanceof Error ? falha.message : 'Não foi possível remover a imagem.',
    );
  }

  atualizarPainel();
  return sucesso('Imagem removida.');
}

// ---------------------------------------------------------------------------
// Convidados
// ---------------------------------------------------------------------------

export async function adicionarConvidadoAction(
  _anterior: EstadoDeFormulario,
  formData: FormData,
): Promise<EstadoDeFormulario> {
  if (!(await temSessao())) return SEM_SESSAO;

  const validacao = novoConvidadoSchema.safeParse({
    nome: texto(formData, 'nome'),
    telefone: texto(formData, 'telefone'),
  });

  if (!validacao.success) {
    return erro(primeiroErro(validacao.error));
  }

  try {
    await criarConvidado(validacao.data.nome, validacao.data.telefone);
  } catch (falha) {
    return erro(
      falha instanceof Error ? falha.message : 'Não foi possível adicionar.',
    );
  }

  atualizarPainel();
  return sucesso(`${validacao.data.nome} entrou na lista.`);
}

export async function adicionarEmLoteAction(
  _anterior: EstadoDeFormulario,
  formData: FormData,
): Promise<EstadoDeFormulario> {
  if (!(await temSessao())) return SEM_SESSAO;

  const validacao = loteSchema.safeParse(texto(formData, 'lista'));
  if (!validacao.success) {
    return erro(primeiroErro(validacao.error));
  }

  try {
    const total = await criarConvidadosEmLote(validacao.data);
    atualizarPainel();
    return sucesso(
      total === 1 ? '1 convidado adicionado.' : `${total} convidados adicionados.`,
    );
  } catch (falha) {
    return erro(
      falha instanceof Error ? falha.message : 'Não foi possível adicionar a lista.',
    );
  }
}

export async function editarConvidadoAction(
  _anterior: EstadoDeFormulario,
  formData: FormData,
): Promise<EstadoDeFormulario> {
  if (!(await temSessao())) return SEM_SESSAO;

  const validacao = edicaoConvidadoSchema.safeParse({
    id: texto(formData, 'id'),
    nome: texto(formData, 'nome'),
    telefone: texto(formData, 'telefone'),
  });

  if (!validacao.success) {
    return erro(primeiroErro(validacao.error));
  }

  try {
    await atualizarConvidado(
      validacao.data.id,
      validacao.data.nome,
      validacao.data.telefone,
    );
  } catch (falha) {
    return erro(falha instanceof Error ? falha.message : 'Não foi possível salvar.');
  }

  atualizarPainel();
  return sucesso('Convidado atualizado.');
}

export async function removerConvidadoAction(
  _anterior: EstadoDeFormulario,
  formData: FormData,
): Promise<EstadoDeFormulario> {
  if (!(await temSessao())) return SEM_SESSAO;

  const validacao = idConvidadoSchema.safeParse({ id: texto(formData, 'id') });
  if (!validacao.success) {
    return erro(primeiroErro(validacao.error));
  }

  try {
    await removerConvidado(validacao.data.id);
  } catch (falha) {
    return erro(falha instanceof Error ? falha.message : 'Não foi possível remover.');
  }

  atualizarPainel();
  return sucesso('Convidado removido.');
}

// ---------------------------------------------------------------------------
// Variantes do convite
// ---------------------------------------------------------------------------


export async function salvarArteDaVarianteAction(
  _anterior: EstadoDeFormulario,
  formData: FormData,
): Promise<EstadoDeFormulario> {
  if (!(await temSessao())) return SEM_SESSAO;

  const codigo = codigoDeVarianteSchema.safeParse(texto(formData, 'codigo'));
  if (!codigo.success) return erro(primeiroErro(codigo.error));

  const imagem = await lerImagemDoFormulario(formData);
  if (!imagem.ok) return erro(imagem.mensagem);

  try {
    await salvarImagemDaVariante(codigo.data, {
      bytes: imagem.bytes,
      tipo: imagem.tipo,
      largura: imagem.largura,
      altura: imagem.altura,
      paleta: imagem.paleta,
    });
  } catch (falha) {
    return erro(falha instanceof Error ? falha.message : 'Não foi possível enviar a arte.');
  }

  atualizarPainel();
  return sucesso(`Arte da variante ${codigo.data} atualizada.`);
}

export async function removerArteDaVarianteAction(
  _anterior: EstadoDeFormulario,
  formData: FormData,
): Promise<EstadoDeFormulario> {
  if (!(await temSessao())) return SEM_SESSAO;

  const codigo = codigoDeVarianteSchema.safeParse(texto(formData, 'codigo'));
  if (!codigo.success) return erro(primeiroErro(codigo.error));

  try {
    await removerImagemDaVariante(codigo.data);
  } catch (falha) {
    return erro(falha instanceof Error ? falha.message : 'Não foi possível remover a arte.');
  }

  atualizarPainel();
  return sucesso(`Arte da variante ${codigo.data} removida.`);
}

/** Define qual arte um convidado recebe. Texto vazio limpa a escolha. */
export async function definirVarianteAction(
  _anterior: EstadoDeFormulario,
  formData: FormData,
): Promise<EstadoDeFormulario> {
  if (!(await temSessao())) return SEM_SESSAO;

  const id = idConvidadoSchema.safeParse({ id: texto(formData, 'id') });
  if (!id.success) return erro(primeiroErro(id.error));

  const bruto = texto(formData, 'codigo').trim();
  let codigo: string | null = null;

  if (bruto.length > 0) {
    const validacao = codigoDeVarianteSchema.safeParse(bruto);
    if (!validacao.success) return erro(primeiroErro(validacao.error));
    codigo = validacao.data;
  }

  try {
    await definirVariante(id.data.id, codigo);
  } catch (falha) {
    return erro(falha instanceof Error ? falha.message : 'Não foi possível salvar.');
  }

  atualizarPainel();
  return sucesso(codigo ? `Tamanho ${codigo} definido.` : 'Tamanho removido.');
}

/** Atribui uma variante a todo mundo que ainda nao tem nenhuma. */
export async function distribuirVarianteAction(
  _anterior: EstadoDeFormulario,
  formData: FormData,
): Promise<EstadoDeFormulario> {
  if (!(await temSessao())) return SEM_SESSAO;

  const codigo = codigoDeVarianteSchema.safeParse(texto(formData, 'codigo'));
  if (!codigo.success) return erro(primeiroErro(codigo.error));

  try {
    const total = await definirVarianteDosSemVariante(codigo.data);
    atualizarPainel();
    return sucesso(
      total === 0
        ? 'Todo mundo já tinha um tamanho definido.'
        : total === 1
          ? `1 convidado recebeu o tamanho ${codigo.data}.`
          : `${total} convidados receberam o tamanho ${codigo.data}.`,
    );
  } catch (falha) {
    return erro(falha instanceof Error ? falha.message : 'Não foi possível distribuir.');
  }
}

// ---------------------------------------------------------------------------
// Sessao
// ---------------------------------------------------------------------------

export async function sairAction(): Promise<void> {
  await encerrarSessao();
  redirect('/admin/entrar');
}
