'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';

import {
  RESPOSTA_OCIOSA,
  type EstadoDaResposta,
  type StatusConvidado,
} from '@/types/dominio';

import { Celebracao } from './Celebracao';

type AcaoDeResposta = (
  anterior: EstadoDaResposta,
  formData: FormData,
) => Promise<EstadoDaResposta>;

/**
 * No 4G a resposta pode nao chegar. Uma action que lanca derrubaria a pagina
 * inteira; aqui a falha vira aviso e o formulario continua preenchido.
 */
function semDerrubarAPagina(acao: AcaoDeResposta): AcaoDeResposta {
  return async (anterior, formData) => {
    try {
      return await acao(anterior, formData);
    } catch {
      return {
        estado: 'erro',
        mensagem: 'Sua resposta não chegou. Confira a internet e toque de novo.',
      };
    }
  };
}

interface CampoDeAcompanhante {
  chave: number;
  nome: string;
}

export interface RespostaDoConvidadoProps {
  /** Server Action que grava a resposta. */
  acao: AcaoDeResposta;
  /** Campos fixos enviados junto, como o token ou o codigo da arte. */
  camposOcultos: Record<string, string>;
  /**
   * Link unico: mostra "Responder por outra pessoa", para quem divide o
   * celular nao sobrescrever a resposta de quem respondeu antes.
   */
  permitirOutraPessoa?: boolean;
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
  acao,
  camposOcultos,
  permitirOutraPessoa = false,
  nomeInicial,
  acompanhantesIniciais,
  maxAcompanhantes,
  statusInicial,
  coresDaCelebracao,
  painelDeCalendario,
}: RespostaDoConvidadoProps) {
  const acaoProtegida = useMemo(() => semDerrubarAPagina(acao), [acao]);
  const [resultado, enviar, enviando] = useActionState(acaoProtegida, RESPOSTA_OCIOSA);

  const [editando, setEditando] = useState(false);
  // Controlado, para a tela de confirmacao mostrar o nome que acabou de ser
  // digitado. No link unico a pessoa chega sem nome nenhum.
  const [nome, setNome] = useState(nomeInicial);
  // Proxima resposta cria uma pessoa nova em vez de atualizar a anterior.
  const [outraPessoa, setOutraPessoa] = useState(false);

  // Cada resposta gravada fecha o formulario e volta ao resumo. Ajuste
  // durante o render, nao em efeito, para nao encadear um render a mais.
  const [ultimoResultado, setUltimoResultado] = useState(resultado);
  if (resultado !== ultimoResultado) {
    setUltimoResultado(resultado);
    if (resultado.estado === 'confirmado' || resultado.estado === 'recusado') {
      setEditando(false);
      setOutraPessoa(false);
    }
  }
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

  function alterarAcompanhante(chave: number, novoNome: string) {
    setAcompanhantes((atuais) =>
      atuais.map((item) => (item.chave === chave ? { ...item, nome: novoNome } : item)),
    );
  }

  // O que estava na tela antes de "outra pessoa", para o Cancelar devolver.
  const antesDeOutraPessoa = useRef<{ nome: string; acompanhantes: CampoDeAcompanhante[] } | null>(
    null,
  );

  function responderPorOutraPessoa() {
    antesDeOutraPessoa.current = { nome, acompanhantes };
    setNome('');
    setAcompanhantes([]);
    setOutraPessoa(true);
    setEditando(true);
  }

  const botaoOutraPessoa = permitirOutraPessoa ? (
    <button type="button" className="botao-texto mt-3 block" onClick={responderPorOutraPessoa}>
      Responder por outra pessoa
    </button>
  ) : null;

  const nomeExibido = nome.trim() || nomeInicial;

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
            <li className="texto-destacado">{nomeExibido}</li>
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
            {botaoOutraPessoa}
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
          Obrigado por avisar, {nomeExibido}. Se mudar de ideia, é só voltar aqui.
        </p>

        <div className="mt-8 border-t border-[var(--cor-borda)] pt-5">
          <button
            type="button"
            className="botao-texto"
            onClick={() => setEditando(true)}
          >
            Mudei de ideia, quero confirmar
          </button>
          {botaoOutraPessoa}
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------------- formulario
  const jaRespondeu = (confirmado || recusado) && !outraPessoa;

  return (
    <section className="entrada entrada-4" aria-labelledby="titulo-formulario">
      <div className="filete mb-7" aria-hidden="true">
        <span className="filete-losango" />
      </div>

      <h2 id="titulo-formulario" className="titulo-secao">
        {jaRespondeu ? 'Ajustar sua resposta' : 'Você vem?'}
      </h2>

      <form action={enviar} className="mt-6 space-y-6">
        {Object.entries(camposOcultos).map(([chave, valor]) => (
          <input key={chave} type="hidden" name={chave} value={valor} />
        ))}
        {outraPessoa ? <input type="hidden" name="novo" value="1" /> : null}

        <div>
          <label className="rotulo" htmlFor="campo-nome">
            Seu nome
          </label>
          <input
            id="campo-nome"
            className="campo"
            name="nome"
            type="text"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            maxLength={80}
            required
            autoComplete="name"
            enterKeyHint="next"
            aria-describedby="ajuda-nome"
          />
          <p id="ajuda-nome" className="mt-2 text-xs text-[var(--cor-tinta-suave)]">
            Obrigatório, mesmo se você não puder ir: é assim que sabemos quem respondeu.
          </p>
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
                onClick={() => {
                  if (outraPessoa && antesDeOutraPessoa.current) {
                    setNome(antesDeOutraPessoa.current.nome);
                    setAcompanhantes(antesDeOutraPessoa.current.acompanhantes);
                  }
                  setOutraPessoa(false);
                  setEditando(false);
                }}
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
