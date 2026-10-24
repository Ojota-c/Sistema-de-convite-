'use server';

import { revalidatePath } from 'next/cache';

import { normalizarToken } from '@/lib/token';
import { confirmacaoSchema, primeiroErro, recusaSchema } from '@/lib/validacao';
import type { EstadoDaResposta } from '@/types/dominio';
import { confirmarPresenca, recusarConvite } from '@/server/convidados';
import { buscarEvento } from '@/server/evento';
import {
  LIMITE_CONFIRMACAO,
  chaveDeLimite,
  dentroDoLimite,
  enderecoDoCliente,
} from '@/server/limite';

/**
 * Resposta do convidado: confirmar presenca ou avisar que nao vai poder ir.
 *
 * Toda entrada passa por zod, o token vem do formulario mas e validado de
 * novo aqui, e ha rate limit por endereco. Nenhum dado de um convidado chega
 * a outro: a action so enxerga a propria linha, achada pelo token.
 */

const ERRO_GENERICO =
  'Não conseguimos registrar sua resposta agora. Tente de novo em instantes.';
const ERRO_CONVITE =
  'Este convite não foi encontrado. Confira se o link veio completo.';

function textoDoCampo(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === 'string' ? valor : '';
}

export async function responderConvite(
  _estadoAnterior: EstadoDaResposta,
  formData: FormData,
): Promise<EstadoDaResposta> {
  const token = normalizarToken(formData.get('token'));
  if (!token) {
    return { estado: 'erro', mensagem: ERRO_CONVITE };
  }

  const endereco = await enderecoDoCliente();
  const liberado = await dentroDoLimite(
    chaveDeLimite('responder', `${endereco}:${token}`),
    LIMITE_CONFIRMACAO,
  );
  if (!liberado) {
    return {
      estado: 'erro',
      mensagem: 'Muitas tentativas seguidas. Espere um minutinho e tente de novo.',
    };
  }

  const querRecusar = formData.get('acao') === 'recusar';

  if (querRecusar) {
    const validacao = recusaSchema.safeParse({ nome: textoDoCampo(formData, 'nome') });
    if (!validacao.success) {
      return { estado: 'erro', mensagem: primeiroErro(validacao.error) };
    }

    const resultado = await recusarConvite(token, validacao.data.nome);
    if (!resultado.ok) {
      return {
        estado: 'erro',
        mensagem:
          resultado.erro === 'convidado_nao_encontrado' ? ERRO_CONVITE : ERRO_GENERICO,
      };
    }

    revalidatePath(`/c/${token}`);
    return { estado: 'recusado' };
  }

  const acompanhantes = formData
    .getAll('acompanhante')
    .filter((valor): valor is string => typeof valor === 'string')
    .map((valor) => valor.trim())
    .filter((valor) => valor.length > 0);

  const validacao = confirmacaoSchema.safeParse({
    nome: textoDoCampo(formData, 'nome'),
    acompanhantes,
  });
  if (!validacao.success) {
    return { estado: 'erro', mensagem: primeiroErro(validacao.error) };
  }

  // O limite tambem e conferido dentro da transacao no Postgres. Esta
  // verificacao existe para dar uma mensagem clara em vez de um erro seco.
  const evento = await buscarEvento();
  if (validacao.data.acompanhantes.length > evento.maxAcompanhantes) {
    return {
      estado: 'erro',
      mensagem:
        evento.maxAcompanhantes === 0
          ? 'Este convite é individual, sem acompanhantes.'
          : `Você pode levar no máximo ${evento.maxAcompanhantes} ${
              evento.maxAcompanhantes === 1 ? 'acompanhante' : 'acompanhantes'
            }.`,
    };
  }

  const resultado = await confirmarPresenca(
    token,
    validacao.data.nome,
    validacao.data.acompanhantes,
  );

  if (!resultado.ok) {
    if (resultado.erro === 'convidado_nao_encontrado') {
      return { estado: 'erro', mensagem: ERRO_CONVITE };
    }
    if (resultado.erro === 'limite_acompanhantes') {
      return {
        estado: 'erro',
        mensagem: 'Você passou do limite de acompanhantes deste convite.',
      };
    }
    return { estado: 'erro', mensagem: ERRO_GENERICO };
  }

  revalidatePath(`/c/${token}`);
  return { estado: 'confirmado' };
}
