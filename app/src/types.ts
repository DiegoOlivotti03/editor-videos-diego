// Contrato de dados do Reel. Tudo que muda de um vídeo para outro vive em public/reel.json.

export type BrandName = "diego" | "olivotti";

/** Palavra com tempo, em milissegundos, na linha do tempo do vídeo JÁ CORTADO. */
export type Word = { text: string; startMs: number; endMs: number };

export type PanelKind = "image" | "video" | "headline" | "stat" | "bullets";

/** Conteúdo que ocupa a metade de cima da tela enquanto o Diego fala embaixo. */
export type Panel = {
  kind: PanelKind;
  /** segundos na linha do tempo do vídeo cortado */
  from: number;
  to: number;
  /** arquivo dentro de public/ (image e video) */
  src?: string;
  /** headline: o texto; stat: ignorado (use stat.label) */
  text?: string;
  /** crédito da fonte, ex.: "@economesteter". Sempre preencher quando o conteúdo for de terceiros. */
  source?: string;
  /** bullets */
  items?: string[];
  /** stat: número que sobe até o valor final */
  stat?: {
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    label: string;
  };
  /** video: segundo do arquivo em que começa a reprodução */
  videoStartFrom?: number;
};

export type Hook = {
  text: string;
  /** palavras que ficam na cor de destaque (comparação sem pontuação, sem diferenciar maiúsculas) */
  highlight?: string[];
  from: number;
  to: number;
};

export type LowerThird = {
  line1: string;
  line2?: string;
  from: number;
  to: number;
};

export type ReelProps = {
  brand: BrandName;
  /** arquivo do Diego falando, dentro de public/, já cortado e em 1080x1920 */
  speaker: string;
  durationSeconds: number;
  fps: number;
  /** fração da altura que o conteúdo ocupa quando a tela está dividida (0.40 a 0.48) */
  splitRatio: number;
  /** onde fica o rosto no vídeo vertical, em % da altura (30 a 38 costuma servir) */
  faceY: number;
  captions: Word[];
  captionsCaps: boolean;
  panels: Panel[];
  /** instantes (s) em que o zoom alterna entre normal e aproximado; esconde cortes secos */
  zoomCuts: number[];
  zoomLevel: number;
  hook?: Hook;
  lowerThird?: LowerThird;
  sfx: boolean;
};
