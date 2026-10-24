import { z } from 'zod';

/**
 * Validacao e limpeza de toda entrada do sistema.
 *
 * Regra geral: nada entra no banco sem passar por um schema daqui. Textos sao
 * aparados, caracteres de controle somem e os sinais de menor e maior sao
 * recusados, de modo que nenhum campo carregue marcacao HTML.
 */

/** Todos os caracteres de controle, inclusive quebras de linha. */
const CARACTERES_DE_CONTROLE = /[\u0000-\u001f\u007f-\u009f]/g;

/** Caracteres de controle, menos a propria quebra de linha. */
const CONTROLE_EXCETO_QUEBRA = /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;

const ESPACOS_SEGUIDOS = /\s+/g;
const SINAIS_DE_HTML = /[<>]/;

export const LIMITE_NOME = 80;
export const LIMITE_TITULO = 120;
export const LIMITE_LOCAL = 120;
export const LIMITE_ENDERECO = 200;
export const LIMITE_OBSERVACOES = 600;
export const LIMITE_MENSAGEM = 900;
export const LIMITE_LOTE = 300;

/** Uma linha so: tira controle, junta espacos repetidos e apara as pontas. */
export function limparTexto(valor: string): string {
  return valor
    .replace(CARACTERES_DE_CONTROLE, ' ')
    .replace(ESPACOS_SEGUIDOS, ' ')
    .trim();
}

/** Varias linhas: preserva as quebras, mas limpa cada linha e corta excessos. */
export function limparTextoMultilinha(valor: string): string {
  return valor
    .replace(/\r\n?/g, '\n')
    .replace(CONTROLE_EXCETO_QUEBRA, '')
    .split('\n')
    .map((linha) => linha.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function semHtml(valor: string): boolean {
  return !SINAIS_DE_HTML.test(valor);
}

const ERRO_HTML = { error: 'O texto não pode conter os sinais < ou >.' } as const;

// ---------------------------------------------------------------------------
// Blocos reaproveitados
// ---------------------------------------------------------------------------

export const nomeSchema = z
  .string({ error: 'Informe o nome.' })
  .trim()
  .min(1, { error: 'Informe o nome.' })
  .max(LIMITE_NOME, { error: `O nome pode ter no máximo ${LIMITE_NOME} caracteres.` })
  .refine(semHtml, ERRO_HTML)
  .transform(limparTexto);

/**
 * Telefone opcional. Guarda so os digitos, ja com o codigo do pais.
 * Numero brasileiro digitado sem o 55 recebe o 55 automaticamente.
 */
export function normalizarTelefone(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length === 0) return null;
  if (digitos.length < 8 || digitos.length > 15) return null;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

export const telefoneSchema = z
  .string()
  .trim()
  .max(30, { error: 'Telefone longo demais.' })
  .optional()
  .nullable()
  .transform((valor) => normalizarTelefone(valor ?? null));

function textoOpcional(limite: number, rotulo: string) {
  return z
    .string()
    .trim()
    .max(limite, { error: `${rotulo} pode ter no máximo ${limite} caracteres.` })
    .refine(semHtml, ERRO_HTML)
    .optional()
    .nullable()
    .transform((valor) => {
      const limpo = limparTexto(valor ?? '');
      return limpo.length > 0 ? limpo : null;
    });
}

function textoLongoOpcional(limite: number, rotulo: string) {
  return z
    .string()
    .max(limite, { error: `${rotulo} pode ter no máximo ${limite} caracteres.` })
    .refine(semHtml, ERRO_HTML)
    .optional()
    .nullable()
    .transform((valor) => {
      const limpo = limparTextoMultilinha(valor ?? '');
      return limpo.length > 0 ? limpo : null;
    });
}

const horaLocalSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, {
    error: 'Data e hora inválidas.',
  });

// ---------------------------------------------------------------------------
// Convidado (publico)
// ---------------------------------------------------------------------------

export const confirmacaoSchema = z.object({
  nome: nomeSchema,
  acompanhantes: z
    .array(nomeSchema)
    .max(10, { error: 'Acompanhantes demais.' })
    .default([]),
});

export type DadosConfirmacao = z.infer<typeof confirmacaoSchema>;

export const recusaSchema = z.object({
  nome: nomeSchema,
});

export type DadosRecusa = z.infer<typeof recusaSchema>;

// ---------------------------------------------------------------------------
// Convidados (painel)
// ---------------------------------------------------------------------------

export const novoConvidadoSchema = z.object({
  nome: nomeSchema,
  telefone: telefoneSchema,
});

export type DadosNovoConvidado = z.infer<typeof novoConvidadoSchema>;

export const edicaoConvidadoSchema = z.object({
  id: z.uuid({ error: 'Convidado inválido.' }),
  nome: nomeSchema,
  telefone: telefoneSchema,
});

export const idConvidadoSchema = z.object({
  id: z.uuid({ error: 'Convidado inválido.' }),
});

/** Lista colada no painel: um nome por linha, sem repetidos. */
export const loteSchema = z
  .string({ error: 'Cole ao menos um nome.' })
  .max(20000, { error: 'Lista longa demais.' })
  .transform((texto) => {
    const vistos = new Set<string>();
    const nomes: string[] = [];

    for (const linha of texto.split(/\r?\n/)) {
      const limpo = limparTexto(linha);
      if (limpo.length === 0) continue;
      if (limpo.length > LIMITE_NOME) continue;
      if (SINAIS_DE_HTML.test(limpo)) continue;

      const chave = limpo.toLocaleLowerCase('pt-BR');
      if (vistos.has(chave)) continue;

      vistos.add(chave);
      nomes.push(limpo);
      if (nomes.length >= LIMITE_LOTE) break;
    }

    return nomes;
  })
  .refine((nomes) => nomes.length > 0, {
    error: 'Nenhum nome válido encontrado na lista.',
  });

// ---------------------------------------------------------------------------
// Evento (painel)
// ---------------------------------------------------------------------------

export const eventoSchema = z
  .object({
    titulo: z
      .string({ error: 'Informe o título do evento.' })
      .trim()
      .min(1, { error: 'Informe o título do evento.' })
      .max(LIMITE_TITULO, {
        error: `O título pode ter no máximo ${LIMITE_TITULO} caracteres.`,
      })
      .refine(semHtml, ERRO_HTML)
      .transform(limparTexto),
    inicio: horaLocalSchema,
    fim: horaLocalSchema.optional().nullable(),
    localNome: textoOpcional(LIMITE_LOCAL, 'O nome do local'),
    localEndereco: textoOpcional(LIMITE_ENDERECO, 'O endereço'),
    observacoes: textoLongoOpcional(LIMITE_OBSERVACOES, 'As observações'),
    mensagemConvite: textoLongoOpcional(LIMITE_MENSAGEM, 'A mensagem'),
    maxAcompanhantes: z.coerce
      .number({ error: 'Informe o limite de acompanhantes.' })
      .int({ error: 'O limite precisa ser um número inteiro.' })
      .min(0, { error: 'O limite não pode ser negativo.' })
      .max(10, { error: 'O limite máximo é 10.' }),
  })
  .refine(
    (dados) => {
      if (!dados.fim) return true;
      // As duas strings tem o mesmo formato, entao a ordem alfabetica
      // coincide com a ordem cronologica.
      return dados.fim >= dados.inicio;
    },
    { error: 'O horário de término não pode ser antes do início.', path: ['fim'] },
  );

export type DadosEvento = z.infer<typeof eventoSchema>;

// ---------------------------------------------------------------------------
// Imagem e paleta
// ---------------------------------------------------------------------------

const COR_HEXADECIMAL = /^#[0-9a-fA-F]{6}$/;

export const paletaSchema = z.object({
  fundo: z.string().regex(COR_HEXADECIMAL),
  papel: z.string().regex(COR_HEXADECIMAL),
  tinta: z.string().regex(COR_HEXADECIMAL),
  tintaSuave: z.string().regex(COR_HEXADECIMAL),
  destaque: z.string().regex(COR_HEXADECIMAL),
  tintaDoDestaque: z.string().regex(COR_HEXADECIMAL),
  borda: z.string().regex(COR_HEXADECIMAL),
});

/** Posicao do filete onde o endereco e escrito na arte, em porcentagem. */
export const linhaDoLinkSchema = z
  .object({
    y: z.coerce.number().min(0).max(100),
    inicio: z.coerce.number().min(0).max(100),
    fim: z.coerce.number().min(0).max(100),
  })
  .refine((v) => v.fim - v.inicio >= 10, {
    error: 'A faixa precisa ter ao menos 10% da largura para caber o endereço.',
    path: ['fim'],
  });

export const TIPOS_DE_IMAGEM = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;

/** Codigo de variante: curto, so letra e numero, sempre em maiuscula. */
export const codigoDeVarianteSchema = z
  .string({ error: 'Informe a variante.' })
  .trim()
  .min(1, { error: 'Informe a variante.' })
  .max(8, { error: 'O código da variante é curto demais para caber tanto texto.' })
  .regex(/^[A-Za-z0-9]+$/, { error: 'A variante aceita apenas letras e números.' })
  .transform((valor) => valor.toUpperCase());

export const uploadImagemSchema = z.object({
  largura: z.coerce.number().int().min(1).max(10000),
  altura: z.coerce.number().int().min(1).max(10000),
  paleta: paletaSchema,
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  senha: z
    .string({ error: 'Informe a senha.' })
    .min(1, { error: 'Informe a senha.' })
    .max(200, { error: 'Senha longa demais.' }),
});

// ---------------------------------------------------------------------------
// Ajuda para Server Actions
// ---------------------------------------------------------------------------

/** Primeira mensagem de erro de um resultado do zod, pronta para a interface. */
export function primeiroErro(erro: z.ZodError): string {
  const issue = erro.issues[0];
  return issue?.message ?? 'Dados inválidos.';
}
