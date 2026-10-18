import type { Word } from "../types";

export type SceneKind = "bigword" | "duo" | "calendar" | "boleto" | "bars" | "line" | "question" | "pie" | "timeline" | "scale" | "checklist" | "counter" | "versus" | "swap" | "chat" | "pics" | "kick" | "debate";

/** Um painel animado da metade de cima. Tempos em segundos na linha do tempo do vídeo cortado. */
export type Scene = {
  kind: SceneKind;
  from: number;
  to: number;
  label?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
};

export type LayoutMode = "split" | "speaker" | "panel";

/** Troca de layout em `from` (s): tela dividida, só a pessoa ou só o painel. O primeiro vale desde 0. */
export type LayoutChange = { from: number; mode: LayoutMode };

export type ModeloProps = {
  speaker: string;
  durationSeconds: number;
  fps: number;
  /** fração da altura ocupada pelo painel de cima (o modelo usa ~0.51) */
  splitRatio: number;
  /** posição vertical do enquadramento da pessoa (0 a 100) */
  faceY: number;
  captions: Word[];
  /** palavras da legenda que ficam em laranja */
  highlight: string[];
  scenes: Scene[];
  layout?: LayoutChange[];
  zoomCuts: number[];
  zoomLevel: number;
  /** instantes (s) com flash branco e som de câmera */
  flashes?: number[];
  sfx: boolean;
};
