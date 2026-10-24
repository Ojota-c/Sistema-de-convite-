import { Alegreya_Sans, Fraunces } from 'next/font/google';

/**
 * O par tipografico do projeto.
 *
 * Fraunces e uma serifada variavel com eixos proprios. O eixo SOFT arredonda
 * os terminais e o WONK inclina alguns itálicos de um jeito deliberadamente
 * irregular, o que da ao titulo um ar de papelaria feita a mao em vez de
 * composicao de computador. O eixo opsz ajusta o desenho ao corpo usado, de
 * modo que o mesmo arquivo serve ao titulo grande e ao texto pequeno.
 *
 * Alegreya Sans e humanista, desenhada pela Huerta Tipografica na Argentina,
 * com acentuacao e cedilha pensados para o portugues. Ela nao e variavel no
 * Google Fonts, entao os pesos vao declarados um a um.
 *
 * As duas entram por next/font, que baixa e hospeda os arquivos junto com o
 * resto do site. Nenhuma requisicao do navegador sai para o Google.
 */

export const serifada = Fraunces({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--fonte-serifada',
  axes: ['SOFT', 'WONK', 'opsz'],
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

export const corpo = Alegreya_Sans({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--fonte-corpo',
  weight: ['400', '500', '700'],
  fallback: ['Avenir Next', 'Segoe UI', 'system-ui', 'sans-serif'],
});

/** Classe que publica as duas variaveis CSS, aplicada na tag html. */
export const classeDasFontes = `${serifada.variable} ${corpo.variable}`;
