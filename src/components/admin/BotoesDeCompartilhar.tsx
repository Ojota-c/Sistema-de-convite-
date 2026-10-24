'use client';

import { useEffect, useRef, useState } from 'react';

type Copiado = 'link' | 'mensagem' | null;

/**
 * Copia um texto para a area de transferencia.
 *
 * A API moderna exige contexto seguro. Em HTTPS e em localhost ela funciona;
 * no resto, o caminho antigo com textarea e execCommand ainda resolve, e e
 * melhor do que deixar o organizador sem o botao.
 */
async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Cai no caminho alternativo abaixo.
  }

  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const deuCerto = document.execCommand('copy');
    document.body.removeChild(area);
    return deuCerto;
  } catch {
    return false;
  }
}

export interface BotoesDeCompartilharProps {
  nome: string;
  link: string;
  mensagem: string;
  linkWhatsApp: string;
}

export function BotoesDeCompartilhar({
  nome,
  link,
  mensagem,
  linkWhatsApp,
}: BotoesDeCompartilharProps) {
  const [copiado, setCopiado] = useState<Copiado>(null);
  const [falhou, setFalhou] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  async function copiar(qual: Exclude<Copiado, null>, texto: string) {
    const deuCerto = await copiarTexto(texto);

    setFalhou(!deuCerto);
    setCopiado(deuCerto ? qual : null);

    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      setCopiado(null);
      setFalhou(false);
    }, 2200);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void copiar('link', link)}
        className="botao botao-contorno px-3 text-sm"
      >
        {copiado === 'link' ? 'Copiado!' : 'Copiar link'}
      </button>

      <button
        type="button"
        onClick={() => void copiar('mensagem', mensagem)}
        className="botao botao-contorno px-3 text-sm"
      >
        {copiado === 'mensagem' ? 'Copiado!' : 'Copiar mensagem'}
      </button>

      <a
        href={linkWhatsApp}
        target="_blank"
        rel="noopener noreferrer"
        className="botao botao-principal px-3 text-sm"
      >
        WhatsApp
        <span className="apenas-leitor-de-tela">
          : enviar convite para {nome} (abre em outra aba)
        </span>
      </a>

      <span aria-live="polite" className="apenas-leitor-de-tela">
        {copiado === 'link' ? 'Link copiado.' : null}
        {copiado === 'mensagem' ? 'Mensagem copiada.' : null}
        {falhou ? 'Não foi possível copiar. Selecione o texto e copie à mão.' : null}
      </span>

      {falhou ? (
        <span className="text-xs text-[#8a4034]">Não deu para copiar aqui.</span>
      ) : null}
    </div>
  );
}
