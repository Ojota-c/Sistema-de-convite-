'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';

import { removerImagemAction, salvarImagemAction } from '@/app/admin/acoes';
import {
  ErroDeImagem,
  formatarTamanho,
  processarImagem,
  type ImagemProcessada,
} from '@/lib/imagem-no-navegador';
import { TIPOS_DE_IMAGEM } from '@/lib/validacao';
import { FORMULARIO_OCIOSO, type EstadoDeFormulario } from '@/types/dominio';

export interface UploadDoConviteProps {
  /** Rota que serve a imagem ja salva, se houver uma. */
  imagemAtual: string | null;
  tituloDoEvento: string;
}

export function UploadDoConvite({ imagemAtual, tituloDoEvento }: UploadDoConviteProps) {
  const [resultado, enviar, enviando] = useActionState(
    salvarImagemAction,
    FORMULARIO_OCIOSO,
  );
  const [resultadoDaRemocao, setResultadoDaRemocao] =
    useState<EstadoDeFormulario>(FORMULARIO_OCIOSO);

  const [processada, setProcessada] = useState<ImagemProcessada | null>(null);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [removendo, iniciarRemocao] = useTransition();
  const [, iniciarEnvio] = useTransition();

  const campoDeArquivo = useRef<HTMLInputElement | null>(null);

  // A URL temporaria da previa precisa ser devolvida ao navegador, senao a
  // imagem fica presa na memoria enquanto a aba estiver aberta. A limpeza do
  // efeito roda tanto ao trocar de imagem quanto ao desmontar o componente.
  useEffect(() => {
    return () => {
      if (processada) URL.revokeObjectURL(processada.previa);
    };
  }, [processada]);

  // Enviou com sucesso: a imagem agora vem do servidor, a previa local sai.
  // O ajuste acontece durante o render, comparando com o resultado ja visto,
  // porque chamar setState dentro de um efeito encadeia renders a toa.
  const [ultimoResultadoVisto, setUltimoResultadoVisto] = useState(resultado);
  if (resultado !== ultimoResultadoVisto) {
    setUltimoResultadoVisto(resultado);
    if (resultado.estado === 'sucesso') setProcessada(null);
  }

  // Limpar o campo e mexer no DOM, entao continua em efeito. Sem isso,
  // escolher o mesmo arquivo de novo nao dispararia o onChange.
  useEffect(() => {
    if (resultado.estado === 'sucesso' && campoDeArquivo.current) {
      campoDeArquivo.current.value = '';
    }
  }, [resultado]);

  async function aoEscolherArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setErroLocal(null);
    setProcessando(true);

    try {
      const nova = await processarImagem(arquivo);
      setProcessada(nova);
    } catch (falha) {
      setProcessada(null);
      setErroLocal(
        falha instanceof ErroDeImagem
          ? falha.message
          : 'Não conseguimos preparar essa imagem. Tente outra.',
      );
    } finally {
      setProcessando(false);
    }
  }

  function aoEnviar() {
    if (!processada) return;

    const dados = new FormData();
    const extensao = processada.tipo === 'image/webp' ? 'webp' : 'jpg';
    dados.set('arquivo', processada.blob, `convite.${extensao}`);
    dados.set('largura', String(processada.largura));
    dados.set('altura', String(processada.altura));
    dados.set('paleta', JSON.stringify(processada.paleta));

    iniciarEnvio(() => enviar(dados));
  }

  function aoRemover() {
    iniciarRemocao(async () => {
      setResultadoDaRemocao(await removerImagemAction());
    });
  }

  const aviso =
    erroLocal !== null
      ? { ehErro: true, texto: erroLocal }
      : resultado.estado === 'erro'
        ? { ehErro: true, texto: resultado.mensagem }
        : resultado.estado === 'sucesso'
          ? { ehErro: false, texto: resultado.mensagem ?? 'Imagem salva.' }
          : resultadoDaRemocao.estado === 'erro'
            ? { ehErro: true, texto: resultadoDaRemocao.mensagem }
            : resultadoDaRemocao.estado === 'sucesso'
              ? { ehErro: false, texto: resultadoDaRemocao.mensagem ?? 'Imagem removida.' }
              : null;

  const previa = processada?.previa ?? imagemAtual;

  return (
    <div className="space-y-5">
      <div>
        <label className="rotulo" htmlFor="campo-imagem">
          Imagem do convite
        </label>
        <input
          ref={campoDeArquivo}
          id="campo-imagem"
          className="campo file:mr-3 file:rounded-sm file:border-0 file:bg-[var(--cor-destaque)] file:px-3 file:py-1.5 file:text-[var(--cor-tinta-do-destaque)]"
          type="file"
          accept={TIPOS_DE_IMAGEM.join(',')}
          onChange={(evento) => void aoEscolherArquivo(evento)}
          disabled={processando || enviando}
        />
        <p className="mt-2 text-xs text-[var(--cor-tinta-suave)]">
          JPG, PNG ou WebP, até 5 MB. A imagem é reduzida e comprimida aqui
          mesmo, antes de subir, e as cores dela viram o tema da página do
          convidado.
        </p>
      </div>

      {processando ? (
        <p className="pulsando text-sm text-[var(--cor-tinta-suave)]">
          Preparando a imagem...
        </p>
      ) : null}

      {previa ? (
        <figure className="painel-caixa overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- previa local em blob, ou rota propria sem otimizador */}
          <img
            src={previa}
            alt={
              processada
                ? 'Prévia da imagem escolhida para o convite'
                : `Imagem atual do convite de ${tituloDoEvento}`
            }
            className="block h-auto w-full"
          />
          <figcaption className="border-t border-[var(--cor-borda)] px-4 py-3 text-xs text-[var(--cor-tinta-suave)]">
            {processada ? (
              <>
                Nova imagem: {processada.largura}×{processada.altura} pixels,{' '}
                {formatarTamanho(processada.tamanhoFinal)}
                {processada.tamanhoFinal < processada.tamanhoOriginal
                  ? ` (era ${formatarTamanho(processada.tamanhoOriginal)})`
                  : ''}
              </>
            ) : (
              'Imagem salva no convite.'
            )}
          </figcaption>
        </figure>
      ) : (
        <div className="painel-caixa border-dashed px-6 py-10 text-center">
          <p className="text-sm text-[var(--cor-tinta-suave)]">
            Nenhuma imagem ainda. Sem ela o convite continua funcionando, com o
            papel e as cores padrão.
          </p>
        </div>
      )}

      {processada ? (
        <div>
          <p className="rotulo">Cores encontradas</p>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(processada.paleta).map(([nome, cor]) => (
              <li key={nome} className="flex items-center gap-2">
                <span
                  className="inline-block h-6 w-6 rounded-full border border-[var(--cor-borda)]"
                  style={{ backgroundColor: cor }}
                  aria-hidden="true"
                />
                <span className="text-xs text-[var(--cor-tinta-suave)]">{cor}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--cor-tinta-suave)]">
            As cores já foram ajustadas para garantir contraste suficiente no
            texto do convite.
          </p>
        </div>
      ) : null}

      <div aria-live="polite" aria-atomic="true">
        {aviso ? (
          <p
            className={`surgindo rounded-sm border px-4 py-3 text-sm ${
              aviso.ehErro
                ? 'border-[#e3c4bd] bg-[#fbf0ee] text-[#8a4034]'
                : 'border-[#b9d6c6] bg-[#eef6f1] text-[#2f6a4a]'
            }`}
          >
            {aviso.texto}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="botao botao-principal"
          onClick={aoEnviar}
          disabled={!processada || enviando || processando}
        >
          {enviando ? (
            <>
              <span
                className="girando inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              Enviando...
            </>
          ) : (
            'Salvar imagem'
          )}
        </button>

        {imagemAtual && !processada ? (
          <button
            type="button"
            className="botao botao-contorno"
            onClick={aoRemover}
            disabled={removendo}
          >
            {removendo ? 'Removendo...' : 'Remover imagem'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
