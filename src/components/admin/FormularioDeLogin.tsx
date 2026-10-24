'use client';

import { useActionState } from 'react';

import { entrarAction } from '@/app/admin/entrar/acoes';
import { LOGIN_OCIOSO } from '@/types/dominio';

export function FormularioDeLogin() {
  const [resultado, entrar, entrando] = useActionState(entrarAction, LOGIN_OCIOSO);

  return (
    <form action={entrar} className="space-y-5">
      <div>
        <label className="rotulo" htmlFor="campo-senha">
          Senha
        </label>
        <input
          id="campo-senha"
          className="campo"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          autoFocus
          aria-invalid={resultado.estado === 'erro'}
          aria-describedby={resultado.estado === 'erro' ? 'erro-login' : undefined}
        />
      </div>

      <div aria-live="polite" aria-atomic="true">
        {resultado.estado === 'erro' ? (
          <p
            id="erro-login"
            className="surgindo rounded-sm border border-[#e3c4bd] bg-[#fbf0ee] px-4 py-3 text-sm text-[#8a4034]"
          >
            {resultado.mensagem}
          </p>
        ) : null}
      </div>

      <button type="submit" className="botao botao-principal w-full" disabled={entrando}>
        {entrando ? (
          <>
            <span
              className="girando inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            Entrando...
          </>
        ) : (
          'Entrar'
        )}
      </button>
    </form>
  );
}
