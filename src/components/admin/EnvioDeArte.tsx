'use client';

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';

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

/**
 * Uma action que lanca, por queda de internet ou recusa no caminho, derruba a
 * pagina inteira. Aqui a falha vira um aviso no proprio bloco.
 */
function semDerrubarAPagina(acao: Acao): Acao {
  return async (anterior, formData) => {
    try {
      return await acao(anterior, formData);
    } catch {
      return {
        estado: 'erro',
        mensagem: 'A arte não chegou ao servidor. Confira a internet e tente de novo.',
      };
    }
  };
}

export interface EnvioDeArteProps {
  /** Titulo do bloco, por exemplo "Fraldas tamanho M". */
  rotulo: string;
  /** Linha de apoio abaixo do titulo. */
  ajuda?: string;
  /**
   * Rota que serve a arte ja salva, com a versao na URL. A versao muda a cada
   * envio, entao a arte nova aparece na hora, sem o navegador mostrar a velha.
   */
  imagemAtual: string | null;
  /**
   * Se existe arte gravada no banco.
   *
   * Vem separado da previa de proposito: o selo tem de dizer a verdade sobre
   * o banco mesmo que a previa, por qualquer motivo, nao carregue.
   */
  temArte: boolean;
  /** Texto alternativo da imagem ja salva. */
  textoAlternativo: string;
  acaoSalvar: Acao;
  acaoRemover: Acao;
  /** Campos fixos enviados junto, como o codigo da variante. */
  camposExtras?: Record<string, string>;
  /** Identificador unico, para os rotulos nao colidirem entre varios blocos. */
  id: string;
  /** Botoes de envio, logo embaixo da arte. So aparecem com arte salva. */
  envio?: ReactNode;
}

/**
 * Envio de uma arte do convite.
 *
 * A arte salva assim que o arquivo e escolhido. Antes havia um botao "Salvar
 * arte" separado, e escolher o arquivo sem aperta-lo deixava a imagem so na
 * tela: ao sair da pagina ela sumia, e parecia que o sistema nao guardava.
 *
 * O preparo (redimensionar, comprimir, extrair as cores) acontece no
 * navegador, antes do envio.
 */
export function EnvioDeArte({
  rotulo,
  ajuda,
  imagemAtual,
  temArte,
  textoAlternativo,
  acaoSalvar,
  acaoRemover,
  camposExtras = {},
  id,
  envio,
}: EnvioDeArteProps) {
  const salvar = useMemo(() => semDerrubarAPagina(acaoSalvar), [acaoSalvar]);
  const tirar = useMemo(() => semDerrubarAPagina(acaoRemover), [acaoRemover]);
  const [resultado, enviar, enviando] = useActionState(salvar, FORMULARIO_OCIOSO);
  const [remocao, remover, removendo] = useActionState(tirar, FORMULARIO_OCIOSO);

  const [processada, setProcessada] = useState<ImagemProcessada | null>(null);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);
  const [, iniciarEnvio] = useTransition();

  const campoDeArquivo = useRef<HTMLInputElement | null>(null);

  // Devolve a URL temporaria ao navegador quando a previa muda ou some.
  useEffect(() => {
    return () => {
      if (processada) URL.revokeObjectURL(processada.previa);
    };
  }, [processada]);

  // Salvou: a previa local sai e entra a arte servida pelo sistema, que agora
  // tem endereco novo. Ajuste durante o render, nao em efeito.
  const [ultimoVisto, setUltimoVisto] = useState(resultado);
  if (resultado !== ultimoVisto) {
    setUltimoVisto(resultado);
    if (resultado.estado === 'sucesso') setProcessada(null);
  }

  // O mesmo arquivo pode ser escolhido de novo depois de qualquer resposta.
  useEffect(() => {
    if (resultado.estado !== 'ocioso' && campoDeArquivo.current) {
      campoDeArquivo.current.value = '';
    }
  }, [resultado]);

  function enviarArte(imagem: ImagemProcessada) {
    const dados = new FormData();
    for (const [chave, valor] of Object.entries(camposExtras)) dados.set(chave, valor);

    const extensao = imagem.tipo === 'image/webp' ? 'webp' : 'jpg';
    dados.set('arquivo', imagem.blob, `convite.${extensao}`);
    dados.set('largura', String(imagem.largura));
    dados.set('altura', String(imagem.altura));
    dados.set('paleta', JSON.stringify(imagem.paleta));

    iniciarEnvio(() => enviar(dados));
  }

  async function aoEscolher(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setErroLocal(null);
    setConfirmandoRemocao(false);
    setProcessando(true);
    try {
      const imagem = await processarImagem(arquivo);
      setProcessada(imagem);
      enviarArte(imagem);
    } catch (falha) {
      setProcessada(null);
      setErroLocal(
        falha instanceof ErroDeImagem
          ? falha.message
          : 'Não conseguimos preparar essa imagem. Tente outra.',
      );
      if (campoDeArquivo.current) campoDeArquivo.current.value = '';
    } finally {
      setProcessando(false);
    }
  }

  const ocupado = processando || enviando || removendo;
  const falhouAoSalvar = processada !== null && resultado.estado === 'erro' && !enviando;

  const aviso =
    erroLocal !== null
      ? { ehErro: true, texto: erroLocal }
      : processando || enviando
        ? null
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
          className={`etiqueta ${temArte ? 'etiqueta-confirmado' : 'etiqueta-sem-resposta'}`}
        >
          {temArte ? 'Arte salva' : 'Falta a arte'}
        </span>
      </div>

      {ajuda ? (
        <p className="mt-1 text-xs text-[var(--cor-tinta-suave)]">{ajuda}</p>
      ) : null}

      {previa ? (
        <figure className="relative mt-3 overflow-hidden rounded-sm border border-[var(--cor-borda)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- previa local em blob, ou rota propria sem otimizador */}
          <img
            src={previa}
            alt={processada ? `Prévia da arte escolhida para ${rotulo}` : textoAlternativo}
            className={`block max-h-72 w-full object-contain ${ocupado ? 'opacity-60' : ''}`}
          />
          {processada ? (
            <figcaption className="border-t border-[var(--cor-borda)] px-3 py-2 text-xs text-[var(--cor-tinta-suave)]">
              {processada.largura}×{processada.altura},{' '}
              {formatarTamanho(processada.tamanhoFinal)}
              {processada.tamanhoFinal < processada.tamanhoOriginal
                ? ` (era ${formatarTamanho(processada.tamanhoOriginal)})`
                : ''}
            </figcaption>
          ) : null}
        </figure>
      ) : (
        <p className="mt-3 rounded-sm border border-dashed border-[var(--cor-borda)] px-4 py-6 text-center text-xs text-[var(--cor-tinta-suave)]">
          Nenhuma arte ainda. Escolha a imagem abaixo e ela é salva na hora.
        </p>
      )}

      {temArte && !processada && envio ? envio : null}

      <div aria-live="polite" aria-atomic="true">
        {processando || enviando ? (
          <p className="pulsando mt-3 text-xs text-[var(--cor-tinta-suave)]">
            {processando ? 'Preparando a imagem...' : 'Salvando a arte...'}
          </p>
        ) : aviso ? (
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
        <label
          htmlFor={`arquivo-${id}`}
          className={`botao ${temArte ? 'botao-contorno' : 'botao-principal'} cursor-pointer px-3 text-sm ${
            ocupado ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {temArte ? 'Trocar arte' : 'Escolher arte'}
          <span className="apenas-leitor-de-tela"> de {rotulo}</span>
        </label>
        <input
          ref={campoDeArquivo}
          id={`arquivo-${id}`}
          className="apenas-leitor-de-tela"
          type="file"
          accept={TIPOS_DE_IMAGEM.join(',')}
          onChange={(evento) => void aoEscolher(evento)}
          disabled={ocupado}
        />

        {falhouAoSalvar ? (
          <button
            type="button"
            className="botao botao-contorno px-3 text-sm"
            onClick={() => enviarArte(processada)}
          >
            Tentar de novo
          </button>
        ) : null}

        {temArte && !processada ? (
          confirmandoRemocao ? (
            <form action={remover} className="flex flex-wrap gap-2">
              {Object.entries(camposExtras).map(([chave, valor]) => (
                <input key={chave} type="hidden" name={chave} value={valor} />
              ))}
              <button
                type="submit"
                className="botao botao-contorno px-3 text-sm text-[#8a4034]"
                disabled={removendo}
              >
                {removendo ? 'Removendo...' : 'Sim, remover'}
              </button>
              <button
                type="button"
                className="botao-texto px-2 text-sm"
                onClick={() => setConfirmandoRemocao(false)}
                disabled={removendo}
              >
                Cancelar
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="botao-texto px-2 text-sm"
              onClick={() => setConfirmandoRemocao(true)}
              disabled={ocupado}
            >
              Remover
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
