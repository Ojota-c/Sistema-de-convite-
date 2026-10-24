/**
 * Paleta do convite.
 *
 * A cor sai da imagem que o organizador envia, mas nenhuma imagem pode deixar
 * o texto ilegivel. Entao o caminho e sempre o mesmo:
 *
 *   pixels -> cores dominantes -> OKLCH -> ajuste de luminosidade -> WCAG AA
 *
 * OKLCH e usado porque, diferente de HSL, mexer na luminosidade preserva o
 * matiz e a saturacao percebidos. Dá para escurecer um tom de pessego ate ele
 * passar no contraste sem que ele vire marrom.
 *
 * Nenhuma dependencia externa: as matrizes de conversao sao as do OKLab,
 * de Bjorn Ottosson.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Oklch {
  /** Luminosidade percebida, de 0 a 1. */
  l: number;
  /** Croma. Zero e cinza; acima de 0.37 quase nada cabe no sRGB. */
  c: number;
  /** Matiz em graus, de 0 a 360. */
  h: number;
}

export interface Paleta {
  /** Fundo da pagina, o "papel de fora". */
  fundo: string;
  /** Superficie do cartao do convite. */
  papel: string;
  /** Texto principal. Contraste minimo de 7:1 sobre o papel. */
  tinta: string;
  /** Texto secundario. Contraste minimo de 4.5:1 sobre o papel. */
  tintaSuave: string;
  /** Cor de acento: botoes, filetes, detalhes. */
  destaque: string;
  /** Texto que vai por cima do destaque. */
  tintaDoDestaque: string;
  /** Filete fino. Decorativo, nao precisa de contraste de texto. */
  borda: string;
}

/**
 * Paleta usada antes de existir imagem, e tambem como rede de seguranca.
 * Tom de papel de algodao com um acento de argila.
 */
export const PALETA_PADRAO: Paleta = {
  fundo: '#f2ece1',
  papel: '#fdfaf4',
  tinta: '#2b2721',
  tintaSuave: '#5b5347',
  destaque: '#8a5a3c',
  tintaDoDestaque: '#ffffff',
  borda: '#ddd3c2',
};

// ---------------------------------------------------------------------------
// Conversoes de cor
// ---------------------------------------------------------------------------

const HEX_CURTO = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_LONGO = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

export function hexParaRgb(hex: string): Rgb | null {
  const texto = hex.trim();

  const curto = HEX_CURTO.exec(texto);
  if (curto) {
    const [, r, g, b] = curto;
    return {
      r: Number.parseInt(`${r}${r}`, 16),
      g: Number.parseInt(`${g}${g}`, 16),
      b: Number.parseInt(`${b}${b}`, 16),
    };
  }

  const longo = HEX_LONGO.exec(texto);
  if (longo) {
    const [, r, g, b] = longo;
    return {
      r: Number.parseInt(r ?? '0', 16),
      g: Number.parseInt(g ?? '0', 16),
      b: Number.parseInt(b ?? '0', 16),
    };
  }

  return null;
}

export function rgbParaHex({ r, g, b }: Rgb): string {
  const canal = (valor: number) =>
    Math.round(Math.min(255, Math.max(0, valor)))
      .toString(16)
      .padStart(2, '0');
  return `#${canal(r)}${canal(g)}${canal(b)}`;
}

/** Canal sRGB de 0..255 para luz linear de 0..1. */
function srgbParaLinear(canal: number): number {
  const v = canal / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** Luz linear de 0..1 de volta para canal sRGB de 0..255. */
function linearParaSrgb(valor: number): number {
  const v = Math.min(1, Math.max(0, valor));
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(c * 255);
}

export function rgbParaOklch({ r, g, b }: Rgb): Oklch {
  const lr = srgbParaLinear(r);
  const lg = srgbParaLinear(g);
  const lb = srgbParaLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const lRaiz = Math.cbrt(l);
  const mRaiz = Math.cbrt(m);
  const sRaiz = Math.cbrt(s);

  const eixoL = 0.2104542553 * lRaiz + 0.793617785 * mRaiz - 0.0040720468 * sRaiz;
  const eixoA = 1.9779984951 * lRaiz - 2.428592205 * mRaiz + 0.4505937099 * sRaiz;
  const eixoB = 0.0259040371 * lRaiz + 0.7827717662 * mRaiz - 0.808675766 * sRaiz;

  const croma = Math.sqrt(eixoA * eixoA + eixoB * eixoB);
  const matiz = ((Math.atan2(eixoB, eixoA) * 180) / Math.PI + 360) % 360;

  return { l: eixoL, c: croma, h: matiz };
}

/** OKLCH para luz linear, antes de qualquer corte de gamut. */
function oklchParaLinear({ l, c, h }: Oklch): [number, number, number] {
  const radianos = (h * Math.PI) / 180;
  const eixoA = c * Math.cos(radianos);
  const eixoB = c * Math.sin(radianos);

  const lRaiz = l + 0.3963377774 * eixoA + 0.2158037573 * eixoB;
  const mRaiz = l - 0.1055613458 * eixoA - 0.0638541728 * eixoB;
  const sRaiz = l - 0.0894841775 * eixoA - 1.291485548 * eixoB;

  const lCubo = lRaiz ** 3;
  const mCubo = mRaiz ** 3;
  const sCubo = sRaiz ** 3;

  return [
    4.0767416621 * lCubo - 3.3077115913 * mCubo + 0.2309699292 * sCubo,
    -1.2684380046 * lCubo + 2.6097574011 * mCubo - 0.3413193965 * sCubo,
    -0.0041960863 * lCubo - 0.7034186147 * mCubo + 1.707614701 * sCubo,
  ];
}

const FOLGA_GAMUT = 1e-4;

function cabeNoSrgb(linear: [number, number, number]): boolean {
  return linear.every((v) => v >= -FOLGA_GAMUT && v <= 1 + FOLGA_GAMUT);
}

/**
 * Converte OKLCH em hexadecimal.
 *
 * Quando a cor nao cabe no sRGB, o croma e reduzido por busca binaria em vez
 * de simplesmente cortar os canais. Cortar desloca o matiz, e um rosa fora de
 * gamut acabaria virando vermelho.
 */
export function oklchParaHex(cor: Oklch): string {
  const base: Oklch = {
    l: Math.min(1, Math.max(0, cor.l)),
    c: Math.max(0, cor.c),
    h: ((cor.h % 360) + 360) % 360,
  };

  let linear = oklchParaLinear(base);

  if (!cabeNoSrgb(linear)) {
    let baixo = 0;
    let alto = base.c;
    for (let i = 0; i < 24; i += 1) {
      const meio = (baixo + alto) / 2;
      if (cabeNoSrgb(oklchParaLinear({ ...base, c: meio }))) {
        baixo = meio;
      } else {
        alto = meio;
      }
    }
    linear = oklchParaLinear({ ...base, c: baixo });
  }

  const [r, g, b] = linear;
  return rgbParaHex({
    r: linearParaSrgb(r),
    g: linearParaSrgb(g),
    b: linearParaSrgb(b),
  });
}

export function hexParaOklch(hex: string): Oklch | null {
  const rgb = hexParaRgb(hex);
  return rgb ? rgbParaOklch(rgb) : null;
}

// ---------------------------------------------------------------------------
// Contraste WCAG
// ---------------------------------------------------------------------------

/** Luminancia relativa da WCAG 2.1. */
export function luminanciaRelativa({ r, g, b }: Rgb): number {
  return (
    0.2126 * srgbParaLinear(r) +
    0.7152 * srgbParaLinear(g) +
    0.0722 * srgbParaLinear(b)
  );
}

/** Razao de contraste entre duas cores, de 1 a 21. */
export function razaoDeContraste(corA: string, corB: string): number {
  const a = hexParaRgb(corA);
  const b = hexParaRgb(corB);
  if (!a || !b) return 1;

  const lumA = luminanciaRelativa(a);
  const lumB = luminanciaRelativa(b);
  const clara = Math.max(lumA, lumB);
  const escura = Math.min(lumA, lumB);
  return (clara + 0.05) / (escura + 0.05);
}

/** 4.5:1 para texto normal, o minimo da WCAG AA. */
export const CONTRASTE_AA = 4.5;
/** 3:1 para texto grande e para elementos de interface. */
export const CONTRASTE_AA_GRANDE = 3;
/** 7:1, nivel AAA. Usado no texto principal do convite. */
export const CONTRASTE_AAA = 7;

/**
 * Empurra a luminosidade da cor ate ela passar no contraste pedido,
 * preservando matiz e croma. Se nem preto nem branco resolverem, devolve o
 * que chegar mais perto.
 */
export function ajustarParaContraste(
  cor: string,
  fundo: string,
  alvo: number = CONTRASTE_AA,
): string {
  if (razaoDeContraste(cor, fundo) >= alvo) return cor;

  const base = hexParaOklch(cor);
  const rgbFundo = hexParaRgb(fundo);
  if (!base || !rgbFundo) return cor;

  // Fundo claro pede texto mais escuro, e vice-versa.
  const fundoEhClaro = luminanciaRelativa(rgbFundo) > 0.18;
  const passo = fundoEhClaro ? -0.01 : 0.01;

  let luminosidade = base.l;
  for (let i = 0; i < 110; i += 1) {
    luminosidade += passo;
    if (luminosidade < 0 || luminosidade > 1) break;

    const tentativa = oklchParaHex({ l: luminosidade, c: base.c, h: base.h });
    if (razaoDeContraste(tentativa, fundo) >= alvo) return tentativa;
  }

  const preto = '#000000';
  const branco = '#ffffff';
  return razaoDeContraste(preto, fundo) >= razaoDeContraste(branco, fundo)
    ? preto
    : branco;
}

/** Escolhe entre texto claro e escuro para ir por cima de uma cor cheia. */
export function melhorTextoSobre(fundo: string): string {
  const claro = '#fffdf8';
  const escuro = '#1d1a16';
  const comClaro = razaoDeContraste(claro, fundo);
  const comEscuro = razaoDeContraste(escuro, fundo);

  if (comClaro >= CONTRASTE_AA || comEscuro >= CONTRASTE_AA) {
    return comClaro >= comEscuro ? claro : escuro;
  }
  return razaoDeContraste('#ffffff', fundo) >= razaoDeContraste('#000000', fundo)
    ? '#ffffff'
    : '#000000';
}

// ---------------------------------------------------------------------------
// Extracao a partir dos pixels
// ---------------------------------------------------------------------------

/** Quantos tons dominantes a quantizacao devolve. */
const CORES_DOMINANTES = 6;

/**
 * Agrupa os pixels em caixas de 16 niveis por canal e devolve as cores mais
 * frequentes, ja com a media de cada caixa.
 *
 * Recebe o array RGBA cru de um canvas, mas nao toca em nenhuma API de
 * navegador: a funcao e pura, e por isso testavel.
 */
export function quantizarPixels(
  pixels: Uint8ClampedArray | number[],
  quantidade: number = CORES_DOMINANTES,
): string[] {
  const somaR = new Map<number, number>();
  const somaG = new Map<number, number>();
  const somaB = new Map<number, number>();
  const contagem = new Map<number, number>();

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const alfa = pixels[i + 3] ?? 0;
    if (alfa < 128) continue;

    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;

    // Branco e preto quase puros dominariam qualquer convite impresso.
    const quaseBranco = r > 244 && g > 244 && b > 244;
    const quasePreto = r < 12 && g < 12 && b < 12;
    if (quaseBranco || quasePreto) continue;

    const caixa = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    somaR.set(caixa, (somaR.get(caixa) ?? 0) + r);
    somaG.set(caixa, (somaG.get(caixa) ?? 0) + g);
    somaB.set(caixa, (somaB.get(caixa) ?? 0) + b);
    contagem.set(caixa, (contagem.get(caixa) ?? 0) + 1);
  }

  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, quantidade)
    .map(([caixa, total]) =>
      rgbParaHex({
        r: (somaR.get(caixa) ?? 0) / total,
        g: (somaG.get(caixa) ?? 0) / total,
        b: (somaB.get(caixa) ?? 0) / total,
      }),
    );
}

/**
 * Monta a paleta completa a partir das cores dominantes da imagem.
 *
 * Todo valor devolvido ja passou pelo ajuste de contraste, entao a pagina do
 * convidado nunca fica ilegivel por causa de uma imagem muito clara ou muito
 * saturada.
 */
export function montarPaleta(coresDominantes: readonly string[]): Paleta {
  const emOklch = coresDominantes
    .map((cor) => hexParaOklch(cor))
    .filter((cor): cor is Oklch => cor !== null);

  if (emOklch.length === 0) return PALETA_PADRAO;

  // A cor que da carater e a mais cromatica, nao necessariamente a mais comum:
  // um convite com muito bege tem o bege como dominante e o verde como alma.
  const base = emOklch.reduce((melhor, atual) =>
    atual.c > melhor.c ? atual : melhor,
  );

  const matiz = base.h;
  const croma = Math.min(0.16, Math.max(0.045, base.c));

  const papel = oklchParaHex({ l: 0.985, c: Math.min(0.01, croma * 0.1), h: matiz });
  const fundo = oklchParaHex({ l: 0.948, c: Math.min(0.022, croma * 0.2), h: matiz });
  const borda = oklchParaHex({ l: 0.87, c: Math.min(0.025, croma * 0.22), h: matiz });

  const destaque = ajustarParaContraste(
    oklchParaHex({ l: 0.54, c: croma, h: matiz }),
    papel,
    CONTRASTE_AA,
  );

  const tinta = ajustarParaContraste(
    oklchParaHex({ l: 0.26, c: Math.min(0.035, croma * 0.3), h: matiz }),
    papel,
    CONTRASTE_AAA,
  );

  const tintaSuave = ajustarParaContraste(
    oklchParaHex({ l: 0.5, c: Math.min(0.03, croma * 0.28), h: matiz }),
    papel,
    CONTRASTE_AA,
  );

  return {
    fundo,
    papel,
    tinta,
    tintaSuave,
    destaque,
    tintaDoDestaque: melhorTextoSobre(destaque),
    borda,
  };
}

// ---------------------------------------------------------------------------
// Travessia entre banco e CSS
// ---------------------------------------------------------------------------

const CHAVES_DA_PALETA = [
  'fundo',
  'papel',
  'tinta',
  'tintaSuave',
  'destaque',
  'tintaDoDestaque',
  'borda',
] as const satisfies readonly (keyof Paleta)[];

/**
 * Le a paleta gravada no banco (coluna jsonb).
 * Qualquer campo faltando ou mal formado cai no padrao, sem lancar erro:
 * uma paleta estragada nao pode derrubar a pagina do convidado.
 */
export function lerPaleta(valor: unknown): Paleta {
  if (typeof valor !== 'object' || valor === null) return PALETA_PADRAO;

  const bruta = valor as Record<string, unknown>;
  const resultado: Paleta = { ...PALETA_PADRAO };

  for (const chave of CHAVES_DA_PALETA) {
    const cor = bruta[chave];
    if (typeof cor === 'string' && hexParaRgb(cor) !== null) {
      resultado[chave] = rgbParaHex(hexParaRgb(cor) as Rgb);
    }
  }

  return resultado;
}

/** Converte a paleta nas variaveis CSS consumidas pela folha de estilo. */
export function paletaParaVariaveisCss(paleta: Paleta): Record<string, string> {
  return {
    '--cor-fundo': paleta.fundo,
    '--cor-papel': paleta.papel,
    '--cor-tinta': paleta.tinta,
    '--cor-tinta-suave': paleta.tintaSuave,
    '--cor-destaque': paleta.destaque,
    '--cor-tinta-do-destaque': paleta.tintaDoDestaque,
    '--cor-borda': paleta.borda,
  };
}
