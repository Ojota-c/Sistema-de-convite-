'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { responderConvite } from '@/app/c/[token]/acoes';
import { RESPOSTA_OCIOSA, type StatusConvidado } from '@/types/dominio';

import { Celebracao } from './Celebracao';

interface CampoDeAcompanhante {
  chave: number;
  nome: string;
}

export interface RespostaDoConvidadoProps {
  token: string;
  nomeInicial: string;
  acompanhantesIniciais: readonly string[];
  maxAcompanhantes: number;
  statusInicial: StatusConvidado;
  coresDaCelebracao: readonly string[];
  /** Blocos montados no servidor, exibidos depois da confirmacao. */
  painelDeCalendario: React.ReactNode;
}

/**
 * Formulario de resposta e, depois de respondido, o estado de quem ja decidiu.
 *
 * Quem volta ao link depois de confirmar nao ve o formulario de novo: ve quem
 * vai, e um botao para mexer na lista de acompanhantes.
 */
export function RespostaDoConvidado({
  token,
  nomeInicial,
  acompanhantesIniciais,
  maxAcompanhantes,
  statusInicial,
  coresDaCelebracao,
  painelDeCalendario,
}: RespostaDoConvidadoProps) {
  const [resultado, enviar, enviando] = useActionState(
    responderConvite,
    RESPOSTA_OCIOSA,
  );

  const [editando, setEditando] = useState(false);
  const [acompanhantes, setAcompanhantes] = useState<CampoDeAcompanhante[]>(() =>
    acompanhantesIniciais.map((nome, indice) => ({ chave: indice + 1, nome })),
  );

  // Chaves estaveis e previsiveis, para o React nao se perder entre os campos
  // e para o HTML do servidor bater com o do navegador.
  const proximaChave = useRef(acompanhantesIniciais.length + 1);
  const campoRecemCriado = useRef<number | null>(null);
  const areaDeAcompanhantes = useRef<HTMLDivElement | null>(null);

  // Depois de adicionar um acompanhante, o cursor vai direto para o campo novo.
  useEffect(() => {
    if (campoRecemCriado.current === null) return;
    const seletor = `input[data-chave="${campoRecemCriado.current}"]`;
    const campo = areaDeAcompanhantes.current?.querySelector<HTMLInputElement>(seletor);
    campo?.focus();
    campoRecemCriado.current = null;
  }, [acompanhantes]);

  const acabouDeConfirmar = resultado.estado === 'confirmado';
  const acabouDeRecusar = resultado.estado === 'recusado';

  const confirmado =
    acabouDeConfirmar || (statusInicial === 'confirmado' && !acabouDeRecusar);
  const recusado =
    acabouDeRecusar || (statusInicial === 'recusado' && !acabouDeConfirmar);

  const mostrarFormulario = editando || (!confirmado && !recusado);
  const podeAdicionar = acompanhantes.length < maxAcompanhantes;

  // O servidor apara os nomes e descarta os campos vazios. A tela de
  // confirmacao precisa mostrar exatamente o que foi gravado, senao um campo
  // deixado em branco viraria um item vazio na lista de quem vai.
  const acompanhantesConfirmados = acompanhantes
    .map((item) => ({ ...item, nome: item.nome.trim() }))
    .filter((item) => item.nome.length > 0);
  const erro = resultado.estado === 'erro' ? resultado.mensagem : null;

  function adicionarAcompanhante() {
    if (!podeAdicionar) return;
    const chave = proximaChave.current;
    proximaChave.current += 1;
    campoRecemCriado.current = chave;
    setAcompanhantes((atuais) => [...atuais, { chave, nome: '' }]);
  }

  function removerAcompanhante(chave: number) {
    setAcompanhantes((atuais) => atuais.filter((item) => item.chave !== chave));
  }

  function alterarAcompanhante(chave: number, nome: string) {
    setAcompanhantes((atuais) =>
      atuais.map((item) => (item.chave === chave ? { ...item, nome } : item)),
    );
  }

  // ---------------------------------------------------------------- confirmado
  if (confirmado && !mostrarFormulario) {
    return (
      <>
        {acabouDeConfirmar ? <Celebracao cores={coresDaCelebracao} /> : null}

        <section className="entrada" aria-labelledby="titulo-confirmado">
          <div className="filete mb-7" aria-hidden="true">
            <span className="filete-losango" />
          </div>

          <p className="sobretitulo">Tudo certo</p>
          <h2 id="titulo-confirmado" className="titulo-secao mt-2">
            Presença confirmada!
          </h2>

          <p className="mt-4 text-[var(--cor-tinta-suave)]">
            {acompanhantesConfirmados.length === 0
              ? 'Esperamos você.'
              : `Esperamos vocês, todas as ${acompanhantesConfirmados.length + 1} pessoas.`}
          </p>

          <ul className="mt-5 space-y-1.5">
            <li className="texto-destacado">{nomeInicial}</li>
            {acompanhantesConfirmados.map((item) => (
              <li key={item.chave} className="texto-destacado">
                {item.nome}
              </li>
            ))}
          </ul>

          {painelDeCalendario}

          <div className="mt-8 border-t border-[var(--cor-borda)] pt-5">
            <button
              type="button"
              className="botao-texto"
              onClick={() => setEditando(true)}
            >
              Mudar meu nome ou meus acompanhantes
            </button>
          </div>
        </section>
      </>
    );
  }

  // ------------------------------------------------------------------ recusado
  if (recusado && !mostrarFormulario) {
    return (
      <section className="entrada" aria-labelledby="titulo-recusado">
        <div className="filete mb-7" aria-hidden="true">
          <span className="filete-losango" />
        </div>

        <p className="sobretitulo">Resposta registrada</p>
        <h2 id="titulo-recusado" className="titulo-secao mt-2">
          Que pena que você não vai poder ir
        </h2>

        <p className="mt-4 text-[var(--cor-tinta-suave)]">
          Obrigado por avisar, {nomeInicial}. Se mudar de ideia, é só voltar aqui.
        </p>

        <div className="mt-8 border-t border-[var(--cor-borda)] pt-5">
          <button
            type="button"
            className="botao-texto"
            onClick={() => setEditando(true)}
          >
            Mudei de ideia, quero confirmar
          </button>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------------- formulario
  const jaRespondeu = confirmado || recusado;

  return (
    <section className="entrada entrada-4" aria-labelledby="titulo-formulario">
      <div className="filete mb-7" aria-hidden="true">
        <span className="filete-losango" />
      </div>

      <h2 id="titulo-formulario" className="titulo-secao">
        {jaRespondeu ? 'Ajustar sua resposta' : 'Você vem?'}
      </h2>

      <form action={enviar} className="mt-6 space-y-6">
        <input type="hidden" name="token" value={token} />

        <div>
          <label className="rotulo" htmlFor="campo-nome">
            Seu nome
          </label>
          <input
            id="campo-nome"
            className="campo"
            name="nome"
            type="text"
            defaultValue={nomeInicial}
            maxLength={80}
            required
            autoComplete="name"
            enterKeyHint="next"
          />
        </div>

        {maxAcompanhantes > 0 ? (
          <fieldset className="border-0 p-0">
            <legend className="rotulo mb-0 p-0">
              Acompanhantes
              <span className="ml-2 normal-case tracking-normal opacity-70">
                até {maxAcompanhantes}
              </span>
            </legend>

            <div ref={areaDeAcompanhantes} className="mt-3 space-y-3">
              {acompanhantes.map((item, indice) => (
                <div key={item.chave} className="surgindo flex items-center gap-2">
                  <label
                    className="apenas-leitor-de-tela"
                    htmlFor={`acompanhante-${item.chave}`}
                  >
                    Nome do acompanhante {indice + 1}
                  </label>
                  <input
                    id={`acompanhante-${item.chave}`}
                    data-chave={item.chave}
                    className="campo"
                    name="acompanhante"
                    type="text"
                    value={item.nome}
                    onChange={(evento) =>
                      alterarAcompanhante(item.chave, evento.target.value)
                    }
                    placeholder={`Acompanhante ${indice + 1}`}
                    maxLength={80}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => removerAcompanhante(item.chave)}
                    className="botao botao-contorno shrink-0 px-3"
                    aria-label={`Remover acompanhante ${indice + 1}`}
                  >
                    <span aria-hidden="true">&minus;</span>
                  </button>
                </div>
              ))}
            </div>

            {podeAdicionar ? (
              <button
                type="button"
                onClick={adicionarAcompanhante}
                className="botao botao-contorno mt-3 w-full sm:w-auto"
              >
                <span aria-hidden="true">+</span> Adicionar acompanhante
              </button>
            ) : (
              <p className="mt-3 text-sm text-[var(--cor-tinta-suave)]">
                Você já incluiu o máximo de acompanhantes deste convite.
              </p>
            )}
          </fieldset>
        ) : null}

        <div aria-live="polite" aria-atomic="true">
          {erro ? (
            <p className="surgindo rounded-sm border border-[#d9b3ad] bg-[#fbf0ee] px-4 py-3 text-sm text-[#8a4034]">
              {erro}
            </p>
          ) : null}
        </div>

        <div className="space-y-3 pt-1">
          <button
            type="submit"
            name="acao"
            value="confirmar"
            className="botao botao-principal w-full"
            disabled={enviando}
          >
            {enviando ? (
              <>
                <span
                  className="girando inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
                Registrando...
              </>
            ) : (
              'Confirmar presença'
            )}
          </button>

          <div className="text-center">
            <button
              type="submit"
              name="acao"
              value="recusar"
              className="botao-texto"
              disabled={enviando}
            >
              Não vou poder ir
            </button>
          </div>

          {editando ? (
            <div className="text-center">
              <button
                type="button"
                className="botao-texto"
                onClick={() => setEditando(false)}
                disabled={enviando}
              >
                Cancelar
              </button>
            </div>
          ) : null}
        </div>
      </form>
    </section>
  );
}
