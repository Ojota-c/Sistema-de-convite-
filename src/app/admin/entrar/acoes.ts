'use server';

import { redirect } from 'next/navigation';

import { loginSchema } from '@/lib/validacao';
import type { EstadoDoLogin } from '@/types/dominio';
import {
  LIMITE_LOGIN,
  chaveDeLimite,
  dentroDoLimite,
  enderecoDoCliente,
} from '@/server/limite';
import { abrirSessao, senhaConfere } from '@/server/sessao';

/**
 * Login do organizador.
 *
 * A senha e comparada em tempo constante, por digest, de modo que a duracao
 * da resposta nao conte nada sobre a senha certa. O rate limit por endereco
 * corta a tentativa de forca bruta.
 *
 * A mensagem de erro e sempre a mesma, seja a senha vazia, curta ou errada.
 */
export async function entrarAction(
  _anterior: EstadoDoLogin,
  formData: FormData,
): Promise<EstadoDoLogin> {
  const endereco = await enderecoDoCliente();
  const liberado = await dentroDoLimite(
    chaveDeLimite('login', endereco),
    LIMITE_LOGIN,
  );

  if (!liberado) {
    return {
      estado: 'erro',
      mensagem: 'Muitas tentativas. Espere alguns minutos antes de tentar de novo.',
    };
  }

  const valor = formData.get('senha');
  const validacao = loginSchema.safeParse({
    senha: typeof valor === 'string' ? valor : '',
  });

  if (!validacao.success || !senhaConfere(validacao.data.senha)) {
    return { estado: 'erro', mensagem: 'Senha incorreta.' };
  }

  await abrirSessao();
  redirect('/admin');
}
