'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import {
  adicionarConvidadoAction,
  adicionarEmLoteAction,
  editarConvidadoAction,
  removerConvidadoAction,
} from '@/app/admin/acoes';
import { normalizarBusca } from '@/lib/painel';
import type { LinhaDeConvidado } from '@/lib/visao';
import { formatarTelefone } from '@/lib/whatsapp';
import { FORMULARIO_OCIOSO, type EstadoDeFormulario } from '@/types/dominio';

import { BotoesDeCompartilhar } from './BotoesDeCompartilhar';
import { EtiquetaDeStatus } from './EtiquetaDeStatus';

/** Aviso de sucesso ou de erro, com o mesmo desenho em toda a tela. */
function Aviso({ estado }: { estado: EstadoDeFormulario }) {
  if (estado.estado === 'ocioso') return <div aria-live="polite" aria-atomic="true" />;

  const ehErro = estado.estado === 'erro';
  const mensagem = ehErro ? estado.mensagem : (estado.mensagem ?? 'Pronto.');

  return (
    <div aria-live="polite" aria-atomic="true">
      <p
        className={`surgindo rounded-sm border px-4 py-3 text-sm ${
          ehErro
            ? 'border-[#e3c4bd] bg-[#fbf0ee] text-[#8a4034]'
            : 'border-[#b9d6c6] bg-[#eef6f1] text-[#2f6a4a]'
        }`}
      >
        {mensagem}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Adicionar um por vez
// ---------------------------------------------------------------------------

function AdicionarUm() {
  const [resultado, adicionar, enviando] = useActionState(
    adicionarConvidadoAction,
    FORMULARIO_OCIOSO,
  );
  const formulario = useRef<HTMLFormElement | null>(null);

  // Formulario limpo depois do sucesso, para o proximo nome entrar direto.
  useEffect(() => {
    if (resultado.estado === 'sucesso') {
      formulario.current?.reset();
      formulario.current?.querySelector<HTMLInputElement>('input[name="nome"]')?.focus();
    }
  }, [resultado]);

  return (
    <form ref={formulario} action={adicionar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="novo-nome">
            Nome
          </label>
          <input
            id="novo-nome"
            name="nome"
            className="campo"
            type="text"
            maxLength={80}
            required
            autoComplete="off"
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="novo-telefone">
            Telefone <span className="normal-case opacity-70">(opcional)</span>
          </label>
          <input
            id="novo-telefone"
            name="telefone"
            className="campo"
            type="tel"
            inputMode="tel"
            maxLength={30}
            placeholder="(11) 98888-7777"
            autoComplete="off"
          />
        </div>
      </div>

      <Aviso estado={resultado} />

      <button type="submit" className="botao botao-principal" disabled={enviando}>
        {enviando ? 'Adicionando...' : 'Adicionar convidado'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Adicionar uma lista inteira
// ---------------------------------------------------------------------------

function AdicionarEmLote() {
  const [resultado, adicionar, enviando] = useActionState(
    adicionarEmLoteAction,
    FORMULARIO_OCIOSO,
  );
  const formulario = useRef<HTMLFormElement | null>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (resultado.estado === 'sucesso') {
      formulario.current?.reset();
    }
  }, [resultado]);

  if (!aberto) {
    return (
      <button type="button" className="botao-texto" onClick={() => setAberto(true)}>
        Tenho uma lista pronta para colar
      </button>
    );
  }

  return (
    <form ref={formulario} action={adicionar} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="lista-de-nomes">
          Um nome por linha
        </label>
        <textarea
          id="lista-de-nomes"
          name="lista"
          className="campo min-h-40 resize-y"
          rows={8}
          placeholder={'Ana Júlia\nBruno Costa\nCarla Mendes'}
          autoFocus
        />
        <p className="mt-2 text-xs text-[var(--cor-tinta-suave)]">
          Linhas repetidas entram uma vez só. Dá para colar direto de uma
          planilha ou da lista de contatos.
        </p>
      </div>

      <Aviso estado={resultado} />

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="botao botao-principal" disabled={enviando}>
          {enviando ? 'Adicionando...' : 'Adicionar a lista'}
        </button>
        <button
          type="button"
          className="botao botao-contorno"
          onClick={() => setAberto(false)}
          disabled={enviando}
        >
          Fechar
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Uma linha da lista
// ---------------------------------------------------------------------------

function FichaDeConvidado({ linha }: { linha: LinhaDeConvidado }) {
  const [editando, setEditando] = useState(false);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);

  const [edicao, salvar, salvando] = useActionState(
    editarConvidadoAction,
    FORMULARIO_OCIOSO,
  );
  const [remocao, remover, removendo] = useActionState(
    removerConvidadoAction,
    FORMULARIO_OCIOSO,
  );

  // Fecha a edicao quando o salvamento da certo. O ajuste acontece durante o
  // render, comparando com o resultado ja visto, e nao dentro de um efeito:
  // setState em efeito dispara um render em cascata sem necessidade.
  const [ultimoResultadoVisto, setUltimoResultadoVisto] = useState(edicao);
  if (edicao !== ultimoResultadoVisto) {
    setUltimoResultadoVisto(edicao);
    if (edicao.estado === 'sucesso') setEditando(false);
  }

  if (editando) {
    return (
      <li className="painel-caixa px-4 py-4">
        <form action={salvar} className="space-y-4">
          <input type="hidden" name="id" value={linha.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="rotulo" htmlFor={`nome-${linha.id}`}>
                Nome
              </label>
              <input
                id={`nome-${linha.id}`}
                name="nome"
                className="campo"
                type="text"
                defaultValue={linha.nome}
                maxLength={80}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="rotulo" htmlFor={`telefone-${linha.id}`}>
                Telefone
              </label>
              <input
                id={`telefone-${linha.id}`}
                name="telefone"
                className="campo"
                type="tel"
                inputMode="tel"
                defaultValue={linha.telefone ?? ''}
                maxLength={30}
              />
            </div>
          </div>

          <Aviso estado={edicao} />

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="botao botao-principal" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              className="botao botao-contorno"
              onClick={() => setEditando(false)}
              disabled={salvando}
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="painel-caixa px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{linha.nome}</p>
          <p className="mt-0.5 text-sm text-[var(--cor-tinta-suave)]">
            {formatarTelefone(linha.telefone) ?? 'Sem telefone'}
            {linha.acompanhantes.length > 0
              ? ` · com ${linha.acompanhantes.join(', ')}`
              : ''}
          </p>
        </div>
        <EtiquetaDeStatus status={linha.status} />
      </div>

      <div className="mt-4">
        <BotoesDeCompartilhar
          nome={linha.nome}
          link={linha.link}
          mensagem={linha.mensagem}
          linkWhatsApp={linha.linkWhatsApp}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[var(--cor-borda)] pt-3">
        <button type="button" className="botao-texto text-sm" onClick={() => setEditando(true)}>
          Editar
        </button>

        {confirmandoRemocao ? (
          <form action={remover} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={linha.id} />
            <span className="text-sm text-[var(--cor-tinta-suave)]">
              Remover {linha.nome}?
            </span>
            <button
              type="submit"
              className="botao-texto text-sm text-[#8a4034]"
              disabled={removendo}
            >
              {removendo ? 'Removendo...' : 'Sim, remover'}
            </button>
            <button
              type="button"
              className="botao-texto text-sm"
              onClick={() => setConfirmandoRemocao(false)}
              disabled={removendo}
            >
              Não
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="botao-texto text-sm"
            onClick={() => setConfirmandoRemocao(true)}
          >
            Remover
          </button>
        )}
      </div>

      {remocao.estado === 'erro' ? <Aviso estado={remocao} /> : null}
    </li>
  );
}

// ---------------------------------------------------------------------------
// A tela inteira
// ---------------------------------------------------------------------------

export function GerenciarConvidados({ linhas }: { linhas: LinhaDeConvidado[] }) {
  const [busca, setBusca] = useState('');

  const termo = normalizarBusca(busca);
  const visiveis =
    termo.length === 0
      ? linhas
      : linhas.filter((linha) => normalizarBusca(linha.nome).includes(termo));

  return (
    <div className="space-y-10">
      <section aria-labelledby="titulo-adicionar">
        <h1 id="titulo-adicionar" className="titulo-secao">
          Convidados
        </h1>
        <p className="mt-2 text-sm text-[var(--cor-tinta-suave)]">
          Cada pessoa recebe um link próprio. O link não é adivinhável e não
          mostra nada sobre os outros convidados.
        </p>

        <div className="painel-caixa mt-5 px-5 py-5">
          <AdicionarUm />
          <div className="mt-5 border-t border-[var(--cor-borda)] pt-4">
            <AdicionarEmLote />
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-lista-convidados">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="titulo-lista-convidados" className="titulo-secao">
            Lista {linhas.length > 0 ? `(${linhas.length})` : ''}
          </h2>
        </div>

        {linhas.length > 0 ? (
          <div className="mt-4">
            <label className="apenas-leitor-de-tela" htmlFor="busca-convidados">
              Buscar convidado
            </label>
            <input
              id="busca-convidados"
              className="campo"
              type="search"
              placeholder="Buscar por nome"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              autoComplete="off"
            />
          </div>
        ) : null}

        {linhas.length === 0 ? (
          <div className="painel-caixa mt-5 px-6 py-12 text-center">
            <div className="filete mx-auto mb-5 max-w-[10rem]" aria-hidden="true">
              <span className="filete-losango" />
            </div>
            <p className="titulo-secao text-[1.1rem]">A lista está vazia</p>
            <p className="mt-2 text-sm text-[var(--cor-tinta-suave)]">
              Adicione o primeiro nome acima e o link dele já fica pronto para
              enviar.
            </p>
          </div>
        ) : visiveis.length === 0 ? (
          <p className="painel-caixa mt-5 px-6 py-10 text-center text-sm text-[var(--cor-tinta-suave)]">
            Ninguém com esse nome na lista.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {visiveis.map((linha) => (
              <FichaDeConvidado key={linha.id} linha={linha} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
