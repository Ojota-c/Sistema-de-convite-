'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';

import {
  ErroDeImagem,
  formatarTamanho,
  processarImagem,
  type ImagemProcessada,
} from '@/lib/imagem-no-navegador';
import { TIPOS_DE_IMAGEM } from '@/lib/validacao';
import { FORMULARIO_OCIOSO, type EstadoDeFormulario } from '@/types/dominio';

type Acao = (
  anterior: EstadoDeFormulario,
  formData: FormData,
) => Promise<EstadoDeFormulario>;

export interface EnvioDeArteProps {
  /** Titulo do bloco, por exemplo "Fraldas tamanho M". */
  rotulo: string;
  /** Linha de apoio abaixo do titulo. */
  ajuda?: string;
  /** Rota que serve a arte ja salva, quando existe. */
  imagemAtual: string | null;
  /** Texto alternativo da imagem ja salva. */
  textoAlternativo: string;
  acaoSalvar: Acao;
  acaoRemover: Acao;
  /** Campos fixos enviados junto, como o codigo da variante. */
  camposExtras?: Record<string, string>;
  /** Identificador unico, para os rotulos nao colidirem entre varios blocos. */
  id: string;
  compacto?: boolean;
}

/**
 * Envio de uma arte do convite.
 *
 * Serve tanto para a imagem geral do evento quanto para cada variante: o que
 * muda e a Server Action recebida por propriedade e os campos fixos que vao
 * junto no formulario. As regras de redimensionamento, compressao e extracao
 * de paleta sao as mesmas nos dois casos, porque sao as mesmas do navegador.
 */
export function EnvioDeArte({
  rotulo,
  ajuda,
  imagemAtual,
  textoAlternativo,
  acaoSalvar,
  acaoRemover,
  camposExtras = {},
  id,
  compacto = false,
}: EnvioDeArteProps) {
  const [resultado, enviar, enviando] = useActionState(acaoSalvar, FORMULARIO_OCIOSO);
  const [remocao, remover, removendo] = useActionState(acaoRemover, FORMULARIO_OCIOSO);

  const [processada, setProcessada] = useState<ImagemProcessada | null>(null);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [, iniciarEnvio] = useTransition();

  const campoDeArquivo = useRef<HTMLInputElement | null>(null);

  // Devolve a URL temporaria ao navegador quando a previa muda ou some.
  useEffect(() => {
    return () => {
      if (processada) URL.revokeObjectURL(processada.previa);
    };
  }, [processada]);

  // Ajuste durante o render, nao em efeito: setState dentro de efeito
  // encadearia um render a mais sem necessidade.
  const [ultimoVisto, setUltimoVisto] = useState(resultado);
  if (resultado !== ultimoVisto) {
    setUltimoVisto(resultado);
    if (resultado.estado === 'sucesso') setProcessada(null);
  }

  useEffect(() => {
    if (resultado.estado === 'sucesso' && campoDeArquivo.current) {
      campoDeArquivo.current.value = '';
    }
  }, [resultado]);

  async function aoEscolher(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setErroLocal(null);
    setProcessando(true);
    try {
      setProcessada(await processarImagem(arquivo));
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
    for (const [chave, valor] of Object.entries(camposExtras)) dados.set(chave, valor);

    const extensao = processada.tipo === 'image/webp' ? 'webp' : 'jpg';
    dados.set('arquivo', processada.blob, `convite.${extensao}`);
    dados.set('largura', String(processada.largura));
    dados.set('altura', String(processada.altura));
    dados.set('paleta', JSON.stringify(processada.paleta));

    iniciarEnvio(() => enviar(dados));
  }

  const aviso =
    erroLocal !== null
      ? { ehErro: true, texto: erroLocal }
      : resultado.estado === 'erro'
        ? { ehErro: true, texto: resultado.mensagem }
        : resultado.estado === 'sucesso'
          ? { ehErro: false, texto: resultado.mensagem ?? 'Arte salva.' }
          : remocao.estado === 'erro'
            ? { ehErro: true, texto: remocao.mensagem }
            : remocao.estado === 'sucesso'
              ? { ehErro: false, texto: remocao.mensagem ?? 'Arte removida.' }
              : null;

  const previa = processada?.previa ?? imagemAtual;

  return (
    <div className="painel-caixa px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">{rotulo}</h3>
        <span
          className={`etiqueta ${imagemAtual ? 'etiqueta-confirmado' : 'etiqueta-sem-resposta'}`}
        >
          {imagemAtual ? 'Arte enviada' : 'Falta a arte'}
        </span>
      </div>

      {ajuda ? (
        <p className="mt-1 text-xs text-[var(--cor-tinta-suave)]">{ajuda}</p>
      ) : null}

      {previa ? (
        <figure className="mt-3 overflow-hidden rounded-sm border border-[var(--cor-borda)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- previa local em blob, ou rota propria sem otimizador */}
          <img
            src={previa}
            alt={processada ? `Prévia da arte escolhida para ${rotulo}` : textoAlternativo}
            className={`block w-full object-contain ${compacto ? 'max-h-56' : ''}`}
          />
          {processada ? (
            <figcaption className="border-t border-[var(--cor-borda)] px-3 py-2 text-xs text-[var(--cor-tinta-suave)]">
              Nova: {processada.largura}×{processada.altura},{' '}
              {formatarTamanho(processada.tamanhoFinal)}
              {processada.tamanhoFinal < processada.tamanhoOriginal
                ? ` (era ${formatarTamanho(processada.tamanhoOriginal)})`
                : ''}
            </figcaption>
          ) : null}
        </figure>
      ) : (
        <p className="mt-3 rounded-sm border border-dashed border-[var(--cor-borda)] px-4 py-6 text-center text-xs text-[var(--cor-tinta-suave)]">
          Sem arte própria. Quem receber esta variante vê a imagem geral do
          evento.
        </p>
      )}

      <div className="mt-3">
        <label className="apenas-leitor-de-tela" htmlFor={`arquivo-${id}`}>
          Arquivo da arte de {rotulo}
        </label>
        <input
          ref={campoDeArquivo}
          id={`arquivo-${id}`}
          className="campo text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-[var(--cor-destaque)] file:px-3 file:py-1.5 file:text-[var(--cor-tinta-do-destaque)]"
          type="file"
          accept={TIPOS_DE_IMAGEM.join(',')}
          onChange={(evento) => void aoEscolher(evento)}
          disabled={processando || enviando}
        />
      </div>

      {processando ? (
        <p className="pulsando mt-2 text-xs text-[var(--cor-tinta-suave)]">
          Preparando a imagem...
        </p>
      ) : null}

      <div aria-live="polite" aria-atomic="true">
        {aviso ? (
          <p
            className={`surgindo mt-3 rounded-sm border px-3 py-2 text-xs ${
              aviso.ehErro
                ? 'border-[#e3c4bd] bg-[#fbf0ee] text-[#8a4034]'
                : 'border-[#b9d6c6] bg-[#eef6f1] text-[#2f6a4a]'
            }`}
          >
            {aviso.texto}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="botao botao-principal px-3 text-sm"
          onClick={aoEnviar}
          disabled={!processada || enviando || processando}
        >
          {enviando ? 'Enviando...' : 'Salvar arte'}
        </button>

        {imagemAtual && !processada ? (
          <form action={remover}>
            {Object.entries(camposExtras).map(([chave, valor]) => (
              <input key={chave} type="hidden" name={chave} value={valor} />
            ))}
            <button
              type="submit"
              className="botao botao-contorno px-3 text-sm"
              disabled={removendo}
            >
              {removendo ? 'Removendo...' : 'Remover'}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
