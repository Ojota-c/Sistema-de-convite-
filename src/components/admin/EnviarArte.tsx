'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Copia um texto para a area de transferencia.
 *
 * A API moderna exige contexto seguro. Em HTTPS e em localhost ela funciona;
 * no resto, o caminho antigo com textarea e execCommand ainda resolve.
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

export interface EnviarArteProps {
  link: string;
  linkWhatsApp: string;
}

/**
 * Botao de enviar uma arte pelo WhatsApp, embaixo de cada uma das tres.
 *
 * Abre o WhatsApp com a mensagem e o link daquela arte. A previa do link
 * mostra a imagem do tamanho certo, e quem recebe toca nela para abrir a
 * pagina de confirmacao.
 *
 * Mandar a imagem como foto foi descartado de proposito: no iPhone o
 * WhatsApp joga fora o texto quando recebe arquivo junto, e o convidado
 * ficaria sem o link. E uma foto, ao ser tocada, so amplia; quem abre a
 * pagina e a previa do link.
 */
export function EnviarArte({ link, linkWhatsApp }: EnviarArteProps) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  async function copiarLink() {
    const deuCerto = await copiarTexto(link);
    setCopiado(deuCerto);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCopiado(false), 2200);
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a
        href={linkWhatsApp}
        target="_blank"
        rel="noopener noreferrer"
        className="botao botao-principal flex-1 px-3"
      >
        Enviar no WhatsApp
        <span className="apenas-leitor-de-tela"> (abre em outra aba)</span>
      </a>
      <button
        type="button"
        onClick={() => void copiarLink()}
        className="botao botao-contorno px-3 text-sm"
      >
        {copiado ? 'Copiado!' : 'Copiar link'}
      </button>
      <span aria-live="polite" className="apenas-leitor-de-tela">
        {copiado ? 'Link copiado.' : null}
      </span>
    </div>
  );
}
