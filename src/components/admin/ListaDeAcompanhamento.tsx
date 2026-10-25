'use client';

import { useActionState, useMemo, useState } from 'react';

import { removerConvidadoAction } from '@/app/admin/acoes';
import { normalizarBusca } from '@/lib/painel';
import type { LinhaDeConvidado } from '@/lib/visao';
import { FORMULARIO_OCIOSO, ROTULOS_DE_STATUS, type StatusConvidado } from '@/types/dominio';

import { EtiquetaDeStatus } from './EtiquetaDeStatus';

/**
 * Remove uma resposta, em dois toques: o primeiro so pergunta.
 * Serve para limpar resposta repetida ou de teste.
 */
function RemoverResposta({ id, nome }: { id: string; nome: string }) {
  const [resultado, remover, removendo] = useActionState(
    removerConvidadoAction,
    FORMULARIO_OCIOSO,
  );
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        className="botao-texto text-xs"
        onClick={() => setConfirmando(true)}
      >
        Remover<span className="apenas-leitor-de-tela"> a resposta de {nome}</span>
      </button>
    );
  }

  return (
    <form action={remover} className="inline-flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="botao-texto text-xs text-[#8a4034]"
        disabled={removendo}
      >
        {removendo ? 'Removendo...' : 'Sim, remover'}
      </button>
      <button
        type="button"
        className="botao-texto text-xs"
        onClick={() => setConfirmando(false)}
        disabled={removendo}
      >
        Cancelar
      </button>
      {resultado.estado === 'erro' ? (
        <span className="text-xs text-[#8a4034]">{resultado.mensagem}</span>
      ) : null}
    </form>
  );
}

type FiltroDeStatus = StatusConvidado | 'todos';

const FILTROS: { valor: FiltroDeStatus; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'confirmado', rotulo: ROTULOS_DE_STATUS.confirmado },
  { valor: 'recusado', rotulo: ROTULOS_DE_STATUS.recusado },
  // So aparecem se houver alguem assim, o que no link unico nao acontece:
  // sobraram dos convites pessoais de antes.
  { valor: 'sem-resposta', rotulo: ROTULOS_DE_STATUS['sem-resposta'] },
  { valor: 'nao-abriu', rotulo: ROTULOS_DE_STATUS['nao-abriu'] },
];

/** Os dois primeiros filtros aparecem sempre; os de antes, so com alguem neles. */
const FILTROS_FIXOS = new Set<FiltroDeStatus>(['todos', 'confirmado', 'recusado']);

export function ListaDeAcompanhamento({ linhas }: { linhas: LinhaDeConvidado[] }) {
  const [status, setStatus] = useState<FiltroDeStatus>('todos');
  const [busca, setBusca] = useState('');

  const visiveis = useMemo(() => {
    const termo = normalizarBusca(busca);

    return linhas.filter((linha) => {
      if (status !== 'todos' && linha.status !== status) return false;
      if (termo.length === 0) return true;
      if (normalizarBusca(linha.nome).includes(termo)) return true;
      return linha.acompanhantes.some((nome) => normalizarBusca(nome).includes(termo));
    });
  }, [linhas, status, busca]);

  const contagens = useMemo(() => {
    const mapa = new Map<FiltroDeStatus, number>([['todos', linhas.length]]);
    for (const linha of linhas) {
      mapa.set(linha.status, (mapa.get(linha.status) ?? 0) + 1);
    }
    return mapa;
  }, [linhas]);

  return (
    <section aria-labelledby="titulo-lista">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="titulo-lista" className="titulo-secao">
          Quem respondeu
        </h2>
        <a href="/admin/exportar" className="botao-texto text-sm">
          Exportar CSV
        </a>
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <label className="apenas-leitor-de-tela" htmlFor="campo-busca">
            Buscar por nome
          </label>
          <input
            id="campo-busca"
            className="campo"
            type="search"
            placeholder="Buscar por nome"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            autoComplete="off"
          />
        </div>

        <div
          className="rolagem-suave flex gap-2 pb-1"
          role="group"
          aria-label="Filtrar por status"
        >
          {FILTROS.map((filtro) => {
            const ativo = status === filtro.valor;
            const total = contagens.get(filtro.valor) ?? 0;
            if (!FILTROS_FIXOS.has(filtro.valor) && total === 0 && !ativo) return null;

            return (
              <button
                key={filtro.valor}
                type="button"
                onClick={() => setStatus(filtro.valor)}
                aria-pressed={ativo}
                className={`inline-flex min-h-[var(--toque-minimo)] shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
                  ativo
                    ? 'border-[var(--cor-destaque)] bg-[var(--cor-destaque)] text-[var(--cor-tinta-do-destaque)]'
                    : 'border-[var(--cor-borda)] bg-[var(--cor-papel)] text-[var(--cor-tinta-suave)] hover:border-[var(--cor-destaque)]'
                }`}
              >
                {filtro.rotulo}
                <span className="tabular-nums opacity-70">{total}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="apenas-leitor-de-tela" aria-live="polite">
        {visiveis.length} de {linhas.length} respostas exibidas.
      </p>

      {visiveis.length === 0 ? (
        <ListaVazia temConvidados={linhas.length > 0} />
      ) : (
        <>
          {/* Telas estreitas: uma ficha por convidado, legivel sem rolagem lateral. */}
          <ul className="mt-5 space-y-3 md:hidden">
            {visiveis.map((linha) => (
              <li key={linha.id} className="painel-caixa px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{linha.nome}</p>
                  <EtiquetaDeStatus status={linha.status} />
                </div>

                {linha.acompanhantes.length > 0 ? (
                  <p className="mt-2 text-sm text-[var(--cor-tinta-suave)]">
                    Com {linha.acompanhantes.join(', ')}
                  </p>
                ) : null}

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-[var(--cor-tinta-suave)]">
                  <div>
                    <dt className="inline">Fralda: </dt>
                    <dd className="inline">{linha.variante || '—'}</dd>
                  </div>
                  <div>
                    <dt className="inline">Respondeu: </dt>
                    <dd className="inline">{linha.respostaTexto ?? '—'}</dd>
                  </div>
                </dl>

                <div className="mt-3 border-t border-[var(--cor-borda)] pt-2">
                  <RemoverResposta id={linha.id} nome={linha.nome} />
                </div>
              </li>
            ))}
          </ul>

          {/* Telas largas: tabela, que compara melhor linha a linha. */}
          <div className="painel-caixa rolagem-suave mt-5 hidden md:block">
            <table className="painel-tabela">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Resposta</th>
                  <th scope="col">Acompanhantes</th>
                  <th scope="col">Fralda</th>
                  <th scope="col">Respondeu</th>
                  <th scope="col">
                    <span className="apenas-leitor-de-tela">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((linha) => (
                  <tr key={linha.id}>
                    <td>
                      <span className="font-medium">{linha.nome}</span>
                    </td>
                    <td>
                      <EtiquetaDeStatus status={linha.status} />
                    </td>
                    <td className="text-sm text-[var(--cor-tinta-suave)]">
                      {linha.acompanhantes.length > 0
                        ? linha.acompanhantes.join(', ')
                        : '—'}
                    </td>
                    <td className="text-sm whitespace-nowrap text-[var(--cor-tinta-suave)]">
                      {linha.variante || '—'}
                    </td>
                    <td className="text-sm whitespace-nowrap text-[var(--cor-tinta-suave)]">
                      {linha.respostaTexto ?? '—'}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <RemoverResposta id={linha.id} nome={linha.nome} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function ListaVazia({ temConvidados }: { temConvidados: boolean }) {
  return (
    <div className="painel-caixa mt-5 px-6 py-12 text-center">
      <div className="filete mx-auto mb-5 max-w-[10rem]" aria-hidden="true">
        <span className="filete-losango" />
      </div>

      {temConvidados ? (
        <>
          <p className="titulo-secao text-[1.1rem]">Nada com esse filtro</p>
          <p className="mt-2 text-sm text-[var(--cor-tinta-suave)]">
            Tente outro status ou limpe a busca.
          </p>
        </>
      ) : (
        <>
          <p className="titulo-secao text-[1.1rem]">Ninguém respondeu ainda</p>
          <p className="mt-2 text-sm text-[var(--cor-tinta-suave)]">
            Mande o convite pela aba Convite. Cada pessoa que responder
            aparece aqui sozinha.
          </p>
        </>
      )}
    </div>
  );
}
