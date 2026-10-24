'use client';

import { useActionState, useState } from 'react';

import { salvarEventoAction } from '@/app/admin/acoes';
import { MARCADORES, MENSAGEM_PADRAO, aplicarModelo } from '@/lib/whatsapp';
import { FORMULARIO_OCIOSO } from '@/types/dominio';

export interface FormularioDoEventoProps {
  titulo: string;
  /** Formato de input datetime-local, ja no fuso do evento. */
  inicio: string;
  fim: string;
  localNome: string;
  localEndereco: string;
  observacoes: string;
  mensagemConvite: string;
  maxAcompanhantes: number;
  /** Textos prontos para a previa da mensagem. */
  dataPorExtenso: string;
  localCompleto: string;
  exemploDeLink: string;
}

export function FormularioDoEvento(props: FormularioDoEventoProps) {
  const [resultado, salvar, salvando] = useActionState(
    salvarEventoAction,
    FORMULARIO_OCIOSO,
  );

  const [titulo, setTitulo] = useState(props.titulo);
  const [mensagem, setMensagem] = useState(props.mensagemConvite || MENSAGEM_PADRAO);

  const previa = aplicarModelo(mensagem, {
    nome: 'Ana Júlia',
    evento: titulo || 'Chá de Bebê',
    data: props.dataPorExtenso,
    local: props.localCompleto,
    link: props.exemploDeLink,
  });

  return (
    <form action={salvar} className="space-y-7">
      <div>
        <label className="rotulo" htmlFor="campo-titulo">
          Título do evento
        </label>
        <input
          id="campo-titulo"
          name="titulo"
          className="campo"
          type="text"
          value={titulo}
          onChange={(evento) => setTitulo(evento.target.value)}
          maxLength={120}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="campo-inicio">
            Começa em
          </label>
          <input
            id="campo-inicio"
            name="inicio"
            className="campo"
            type="datetime-local"
            defaultValue={props.inicio}
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="campo-fim">
            Termina em <span className="normal-case opacity-70">(opcional)</span>
          </label>
          <input
            id="campo-fim"
            name="fim"
            className="campo"
            type="datetime-local"
            defaultValue={props.fim}
          />
        </div>
      </div>

      <p className="-mt-4 text-xs text-[var(--cor-tinta-suave)]">
        Os horários são sempre no fuso de Brasília, independente de onde você
        estiver ao preencher.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="campo-local-nome">
            Nome do local
          </label>
          <input
            id="campo-local-nome"
            name="localNome"
            className="campo"
            type="text"
            defaultValue={props.localNome}
            maxLength={120}
            placeholder="Casa da Vó"
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="campo-local-endereco">
            Endereço
          </label>
          <input
            id="campo-local-endereco"
            name="localEndereco"
            className="campo"
            type="text"
            defaultValue={props.localEndereco}
            maxLength={200}
            placeholder="Rua das Acácias, 221"
          />
        </div>
      </div>

      <div>
        <label className="rotulo" htmlFor="campo-observacoes">
          Observações <span className="normal-case opacity-70">(aparecem no convite)</span>
        </label>
        <textarea
          id="campo-observacoes"
          name="observacoes"
          className="campo min-h-24 resize-y"
          rows={3}
          defaultValue={props.observacoes}
          maxLength={600}
          placeholder="Traga só a sua alegria. Tem estacionamento na rua de trás."
        />
      </div>

      <div>
        <label className="rotulo" htmlFor="campo-max">
          Limite de acompanhantes por convidado
        </label>
        <input
          id="campo-max"
          name="maxAcompanhantes"
          className="campo max-w-28"
          type="number"
          inputMode="numeric"
          min={0}
          max={10}
          defaultValue={props.maxAcompanhantes}
          required
        />
        <p className="mt-2 text-xs text-[var(--cor-tinta-suave)]">
          Zero deixa o convite individual, sem campo de acompanhante.
        </p>
      </div>

      <fieldset className="border-0 p-0">
        <legend className="rotulo mb-0 p-0">Mensagem que acompanha o link</legend>

        <textarea
          id="campo-mensagem"
          name="mensagemConvite"
          className="campo mt-3 min-h-44 resize-y"
          rows={9}
          value={mensagem}
          onChange={(evento) => setMensagem(evento.target.value)}
          maxLength={900}
          aria-describedby="ajuda-marcadores"
        />

        <p id="ajuda-marcadores" className="mt-2 text-xs text-[var(--cor-tinta-suave)]">
          Use os marcadores {MARCADORES.join(', ')}. Eles são trocados pelos
          dados de cada convidado na hora de enviar.
        </p>

        <div className="mt-4">
          <p className="rotulo">Como vai chegar no WhatsApp</p>
          <div className="painel-caixa bg-[#e7f0e4] px-4 py-3">
            <p className="whitespace-pre-line text-sm">{previa}</p>
          </div>
        </div>

        <button
          type="button"
          className="botao-texto mt-2 text-sm"
          onClick={() => setMensagem(MENSAGEM_PADRAO)}
        >
          Voltar ao texto sugerido
        </button>
      </fieldset>

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
      </div>

      <button type="submit" className="botao botao-principal" disabled={salvando}>
        {salvando ? (
          <>
            <span
              className="girando inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            Salvando...
          </>
        ) : (
          'Salvar convite'
        )}
      </button>
    </form>
  );
}
