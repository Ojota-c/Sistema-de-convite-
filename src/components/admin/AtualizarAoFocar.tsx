'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** Intervalo minimo entre duas atualizacoes, para nao recarregar a toa. */
const INTERVALO_MINIMO_EM_MS = 15_000;

/**
 * Atualiza os dados do painel quando a aba volta ao foco.
 *
 * E o jeito de custo zero de manter o acompanhamento em dia: nada de
 * conexao em tempo real aberta o tempo todo, nada de polling girando sozinho.
 * O organizador volta para a aba e ve o estado atual.
 *
 * A trava de quinze segundos evita uma enxurrada de requisicoes de quem fica
 * alternando entre janelas.
 */
export function AtualizarAoFocar() {
  const router = useRouter();
  // Comeca em zero e so recebe o relogio dentro do efeito: ler Date.now()
  // durante o render deixaria o componente impuro.
  const ultimaAtualizacao = useRef(0);

  useEffect(() => {
    ultimaAtualizacao.current = Date.now();

    function aoVoltar() {
      if (document.visibilityState !== 'visible') return;

      const agora = Date.now();
      if (agora - ultimaAtualizacao.current < INTERVALO_MINIMO_EM_MS) return;

      ultimaAtualizacao.current = agora;
      router.refresh();
    }

    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);

    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
    };
  }, [router]);

  return null;
}
