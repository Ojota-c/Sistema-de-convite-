'use client';

import { useEffect, useRef } from 'react';

interface Papelzinho {
  x: number;
  y: number;
  largura: number;
  altura: number;
  cor: string;
  giro: number;
  giroPorQuadro: number;
  velocidadeX: number;
  velocidadeY: number;
  balanco: number;
}

const DURACAO_EM_MS = 2600;
const QUANTIDADE = 70;

/**
 * Celebracao da confirmacao: papeis picados caindo devagar.
 *
 * Desenhada em canvas, com as cores da propria paleta do convite, para a festa
 * combinar com o papel. Nenhuma biblioteca.
 *
 * Quem pediu menos movimento no sistema nao ve animacao nenhuma: o componente
 * simplesmente nao desenha nada, e a confirmacao continua sendo anunciada em
 * texto pelo leitor de tela.
 */
export function Celebracao({ cores }: { cores: readonly string[] }) {
  const referencia = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = referencia.current;
    if (!canvas) return;

    const prefereMenosMovimento = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefereMenosMovimento) return;

    const contexto = canvas.getContext('2d');
    if (!contexto) return;

    const densidade = Math.min(window.devicePixelRatio || 1, 2);
    let largura = canvas.offsetWidth;
    let altura = canvas.offsetHeight;

    function ajustarTamanho() {
      if (!canvas || !contexto) return;
      largura = canvas.offsetWidth;
      altura = canvas.offsetHeight;
      canvas.width = Math.floor(largura * densidade);
      canvas.height = Math.floor(altura * densidade);
      contexto.setTransform(densidade, 0, 0, densidade, 0, 0);
    }

    ajustarTamanho();

    const paleta = cores.length > 0 ? cores : ['#8a5a3c'];
    const papeis: Papelzinho[] = Array.from({ length: QUANTIDADE }, () => ({
      x: Math.random() * largura,
      // Comecam logo acima da area visivel, espalhados, para a chuva nao
      // aparecer toda de uma vez.
      y: -20 - Math.random() * altura * 0.8,
      largura: 5 + Math.random() * 5,
      altura: 8 + Math.random() * 7,
      cor: paleta[Math.floor(Math.random() * paleta.length)] ?? '#8a5a3c',
      giro: Math.random() * Math.PI * 2,
      giroPorQuadro: (Math.random() - 0.5) * 0.12,
      velocidadeX: (Math.random() - 0.5) * 0.5,
      velocidadeY: 1.1 + Math.random() * 1.5,
      balanco: Math.random() * Math.PI * 2,
    }));

    const comeco = performance.now();
    let quadro = 0;

    function desenhar(agora: number) {
      if (!contexto) return;

      const decorrido = agora - comeco;
      const progresso = decorrido / DURACAO_EM_MS;

      if (progresso >= 1) {
        contexto.clearRect(0, 0, largura, altura);
        return;
      }

      contexto.clearRect(0, 0, largura, altura);
      // Some suavemente no ultimo terco, para o fim nao ser abrupto.
      contexto.globalAlpha = progresso > 0.66 ? 1 - (progresso - 0.66) / 0.34 : 1;

      for (const papel of papeis) {
        papel.balanco += 0.06;
        papel.x += papel.velocidadeX + Math.sin(papel.balanco) * 0.6;
        papel.y += papel.velocidadeY;
        papel.giro += papel.giroPorQuadro;

        contexto.save();
        contexto.translate(papel.x, papel.y);
        contexto.rotate(papel.giro);
        contexto.fillStyle = papel.cor;
        contexto.fillRect(
          -papel.largura / 2,
          -papel.altura / 2,
          papel.largura,
          papel.altura,
        );
        contexto.restore();
      }

      quadro = requestAnimationFrame(desenhar);
    }

    quadro = requestAnimationFrame(desenhar);
    window.addEventListener('resize', ajustarTamanho);

    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener('resize', ajustarTamanho);
    };
  }, [cores]);

  return (
    <canvas
      ref={referencia}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
