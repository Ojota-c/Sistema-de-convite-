'use client';

import { useActionState, useEffect, useState } from 'react';

import { salvarLinhaDoLinkAction } from '@/app/admin/acoes';
import {
  ErroAoMontarConvite,
  montarConviteComLink,
} from '@/lib/convite-com-link';
import {
  dePorcentagem,
  paraPorcentagem,
  type LinhaDoLink,
} from '@/lib/linha-do-link';
import { FORMULARIO_OCIOSO } from '@/types/dominio';

export interface PosicaoDoLinkProps {
  linha: LinhaDoLink;
  /** Rota de uma arte real, para a prévia sair igual ao resultado. */
  urlDaArte: string | null;
  /** Um endereço de exemplo, do tamanho dos de verdade. */
  linkDeExemplo: string;
}

/**
 * Ajuste de onde o endereco e escrito dentro da arte.
 *
 * Existe porque nao da para descobrir isso sozinho. Tentei varrer os pixels
 * procurando o filete do campo em branco, e a arte do Chá da Flora tem tres
 * tracados largos na metade de baixo: a borda da caixa do "clique aqui", o
 * filete de dentro dela e a borda da caixa do churrasco. Para o computador os
 * tres sao idênticos; o que separa o certo dos outros e o significado. Uma
 * volta de ajuste manual resolve de vez e vale para qualquer arte futura.
 *
 * Os valores ja vem medidos na arte atual, entao em geral nao ha o que mexer.
 */
export function PosicaoDoLink({ linha, urlDaArte, linkDeExemplo }: PosicaoDoLinkProps) {
  const [resultado, salvar, salvando] = useActionState(
    salvarLinhaDoLinkAction,
    FORMULARIO_OCIOSO,
  );

  const [y, setY] = useState(paraPorcentagem(linha.y));
  const [inicio, setInicio] = useState(paraPorcentagem(linha.inicio));
  const [fim, setFim] = useState(paraPorcentagem(linha.fim));

  const [previa, setPrevia] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [montando, setMontando] = useState(false);

  // Redesenha a prévia enquanto os números mudam, com uma pausa curta para
  // não gerar uma imagem a cada tecla.
  useEffect(() => {
    if (!urlDaArte) return;

    let cancelado = false;
    let urlGerada: string | null = null;

    const temporizador = setTimeout(() => {
      setMontando(true);
      void montarConviteComLink(urlDaArte, linkDeExemplo, {
        y: dePorcentagem(y),
        inicio: dePorcentagem(inicio),
        fim: dePorcentagem(fim),
      })
        .then(({ blob }) => {
          if (cancelado) return;
          urlGerada = URL.createObjectURL(blob);
          setPrevia(urlGerada);
          setErro(null);
        })
        .catch((falha: unknown) => {
          if (cancelado) return;
          setErro(
            falha instanceof ErroAoMontarConvite
              ? falha.message
              : 'Não conseguimos montar a prévia.',
          );
        })
        .finally(() => {
          if (!cancelado) setMontando(false);
        });
    }, 400);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
      if (urlGerada) URL.revokeObjectURL(urlGerada);
    };
  }, [urlDaArte, linkDeExemplo, y, inicio, fim]);

  if (!urlDaArte) {
    return (
      <p className="painel-caixa px-5 py-6 text-sm text-[var(--cor-tinta-suave)]">
        Envie ao menos uma arte e cadastre um convidado para ajustar onde o
        endereço aparece na imagem.
      </p>
    );
  }

  return (
    <div className="painel-caixa px-5 py-5">
      <p className="text-sm text-[var(--cor-tinta-suave)]">
        Estes números dizem onde escrever o endereço na arte, em porcentagem da
        imagem. Já vêm medidos no convite atual, então só mexa se a arte mudar.
      </p>

      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto]">
        <form action={salvar} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ['y', 'Altura', y, setY, 'Distância do topo'],
                ['inicio', 'Começa em', inicio, setInicio, 'Borda esquerda'],
                ['fim', 'Termina em', fim, setFim, 'Borda direita'],
              ] as const
            ).map(([nome, rotulo, valor, definir, ajuda]) => (
              <div key={nome}>
                <label className="rotulo" htmlFor={`linha-${nome}`}>
                  {rotulo}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id={`linha-${nome}`}
                    name={nome}
                    className="campo"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={valor}
                    onChange={(evento) => definir(Number(evento.target.value))}
                    required
                  />
                  <span aria-hidden="true" className="text-sm text-[var(--cor-tinta-suave)]">
                    %
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--cor-tinta-suave)]">{ajuda}</p>
              </div>
            ))}
          </div>

          <div aria-live="polite" aria-atomic="true">
            {resultado.estado !== 'ocioso' ? (
              <p
                className={`surgindo rounded-sm border px-4 py-3 text-sm ${
                  resultado.estado === 'erro'
                    ? 'border-[#e3c4bd] bg-[#fbf0ee] text-[#8a4034]'
                    : 'border-[#b9d6c6] bg-[#eef6f1] text-[#2f6a4a]'
                }`}
              >
                {resultado.estado === 'erro'
                  ? resultado.mensagem
                  : (resultado.mensagem ?? 'Salvo.')}
              </p>
            ) : null}
            {erro ? (
              <p className="rounded-sm border border-[#e3c4bd] bg-[#fbf0ee] px-4 py-3 text-sm text-[#8a4034]">
                {erro}
              </p>
            ) : null}
          </div>

          <button type="submit" className="botao botao-principal" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar posição'}
          </button>
        </form>

        <figure className="w-full md:w-64">
          <figcaption className="rotulo">
            Prévia {montando ? <span className="pulsando">atualizando...</span> : null}
          </figcaption>
          {previa ? (
            /* eslint-disable-next-line @next/next/no-img-element -- imagem montada em blob no proprio navegador */
            <img
              src={previa}
              alt="Prévia do convite com um endereço de exemplo escrito no campo em branco"
              className="block w-full rounded-sm border border-[var(--cor-borda)]"
            />
          ) : (
            <div className="rounded-sm border border-dashed border-[var(--cor-borda)] px-4 py-10 text-center text-xs text-[var(--cor-tinta-suave)]">
              Montando a prévia...
            </div>
          )}
        </figure>
      </div>
    </div>
  );
}
