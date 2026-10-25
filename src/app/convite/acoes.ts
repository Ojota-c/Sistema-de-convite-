'use server';

import { revalidatePath } from 'next/cache';

import { acharVariante } from '@/lib/arte';
import { confirmacaoSchema, primeiroErro, recusaSchema } from '@/lib/validacao';
import type { EstadoDaResposta } from '@/types/dominio';
import {
  buscarConvidadoPorToken,
  confirmarPresenca,
  criarRespostaAberta,
  recusarConvite,
  removerConvidado,
  type ResultadoDeResposta,
} from '@/server/convidados';
import { buscarEvento } from '@/server/evento';
import {
  LIMITE_CONFIRMACAO,
  chaveDeLimite,
  dentroDoLimite,
  enderecoDoCliente,
} from '@/server/limite';
import { gravarTokenDaResposta, lerTokenDaResposta } from '@/server/resposta';
import { listarVariantes } from '@/server/variantes';

/**
 * Resposta pelo link unico.
 *
 * Ninguem e cadastrado antes. Quem abre o link digita o proprio nome e o dos
 * acompanhantes, e a resposta cai direto no painel.
 *
 * Na primeira resposta nasce uma linha nova e o token dela vai para um cookie.
 * Se a pessoa voltar pelo mesmo celular, a resposta seguinte atualiza essa
 * mesma linha, sem duplicar. O campo "novo" deixa alguem que divide o celular
 * responder por outra pessoa sem sobrescrever a primeira resposta.
 */

const ERRO_GENERICO =
  'Não conseguimos registrar sua resposta agora. Tente de novo em instantes.';

function textoDoCampo(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === 'string' ? valor : '';
}

function mensagemDeFalha(resultado: Exclude<ResultadoDeResposta, { ok: true }>): string {
  return resultado.erro === 'limite_acompanhantes'
    ? 'Você passou do limite de acompanhantes deste convite.'
    : ERRO_GENERICO;
}

export async function responderConviteAberto(
  _estadoAnterior: EstadoDaResposta,
  formData: FormData,
): Promise<EstadoDaResposta> {
  const endereco = await enderecoDoCliente();
  const liberado = await dentroDoLimite(
    chaveDeLimite('responder-link', endereco),
    LIMITE_CONFIRMACAO,
  );
  if (!liberado) {
    return {
      estado: 'erro',
      mensagem: 'Muitas tentativas seguidas. Espere um minutinho e tente de novo.',
    };
  }

  const querRecusar = formData.get('acao') === 'recusar';

  let nome: string;
  let acompanhantes: string[] = [];

  if (querRecusar) {
    const validacao = recusaSchema.safeParse({ nome: textoDoCampo(formData, 'nome') });
    if (!validacao.success) {
      return {
        estado: 'erro',
        mensagem: textoDoCampo(formData, 'nome').trim()
          ? primeiroErro(validacao.error)
          : 'Escreva seu nome para avisar que não vai poder ir.',
      };
    }
    nome = validacao.data.nome;
  } else {
    const validacao = confirmacaoSchema.safeParse({
      nome: textoDoCampo(formData, 'nome'),
      acompanhantes: formData
        .getAll('acompanhante')
        .filter((valor): valor is string => typeof valor === 'string')
        .map((valor) => valor.trim())
        .filter((valor) => valor.length > 0),
    });
    if (!validacao.success) {
      return { estado: 'erro', mensagem: primeiroErro(validacao.error) };
    }
    nome = validacao.data.nome;
    acompanhantes = validacao.data.acompanhantes;

    // O limite tambem e conferido dentro da transacao no Postgres. Esta
    // verificacao existe para dar uma mensagem clara em vez de um erro seco.
    const evento = await buscarEvento();
    if (acompanhantes.length > evento.maxAcompanhantes) {
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
  }

  const responder = (token: string) =>
    querRecusar ? recusarConvite(token, nome) : confirmarPresenca(token, nome, acompanhantes);

  // Mesmo celular, mesma pessoa: atualiza a resposta que ja existe.
  const tokenAnterior = formData.get('novo') === '1' ? null : await lerTokenDaResposta();
  const anterior = tokenAnterior ? await buscarConvidadoPorToken(tokenAnterior) : null;

  if (anterior) {
    const resultado = await responder(anterior.token);
    if (!resultado.ok) return { estado: 'erro', mensagem: mensagemDeFalha(resultado) };
  } else {
    // O codigo so registra qual arte a pessoa recebeu. Um codigo que nao
    // existe vira null, porque a chave estrangeira recusaria a linha inteira.
    const variante = acharVariante(await listarVariantes(), textoDoCampo(formData, 'codigo'));

    let nova: { id: string; token: string };
    try {
      nova = await criarRespostaAberta(nome, variante?.codigo ?? null);
    } catch (falha) {
      console.error('[convite] falha ao criar a resposta:', falha);
      return { estado: 'erro', mensagem: ERRO_GENERICO };
    }

    const resultado = await responder(nova.token);
    if (!resultado.ok) {
      // Sem a resposta gravada, a linha recem-criada ficaria no painel como
      // alguem que nunca respondeu. Melhor apagar e deixar tentar de novo.
      await removerConvidado(nova.id).catch((falha: unknown) =>
        console.error('[convite] linha órfã não removida:', falha),
      );
      return { estado: 'erro', mensagem: mensagemDeFalha(resultado) };
    }

    await gravarTokenDaResposta(nova.token);
  }

  revalidatePath('/admin');
  return querRecusar ? { estado: 'recusado' } : { estado: 'confirmado' };
}
