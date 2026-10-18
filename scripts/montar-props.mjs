#!/usr/bin/env node
// Junta o vídeo cortado, as legendas e o roteiro de edição (brief) em public/reel.json.
//
// Uso:
//   node montar-props.mjs --speaker falas.mp4 --cuts falas.cuts.json --captions captions.json \
//        --brief brief.json --saida public/reel.json
//
// brief.json (tudo opcional): brand, splitRatio, faceY, captionsCaps, zoomLevel, sfx,
//                             hook, lowerThird, panels, zoomCuts
// Se zoomCuts não vier no brief, usa os cortes de silêncio (joints), com espaçamento mínimo.
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const speaker = opt("speaker");
const cutsPath = opt("cuts");
const capsPath = opt("captions");
const briefPath = opt("brief");
const saida = opt("saida", "public/reel.json");
if (!speaker || !cutsPath) {
  console.error("Uso: node montar-props.mjs --speaker falas.mp4 --cuts falas.cuts.json [--captions captions.json] [--brief brief.json] [--saida public/reel.json]");
  process.exit(1);
}

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const cuts = read(cutsPath);
const captions = capsPath ? read(capsPath) : [];
const brief = briefPath ? read(briefPath) : {};

// Zoom automático: usa um corte a cada ~2,6 s no mínimo, para o zoom não virar tremedeira.
const autoZoom = [];
for (const j of cuts.joints ?? []) {
  if (autoZoom.length === 0 || j - autoZoom[autoZoom.length - 1] >= 2.6) autoZoom.push(j);
}

const props = {
  brand: brief.brand ?? "diego",
  speaker,
  durationSeconds: cuts.duration,
  fps: 30,
  splitRatio: brief.splitRatio ?? 0.44,
  faceY: brief.faceY ?? 34,
  captions,
  captionsCaps: brief.captionsCaps ?? false,
  panels: brief.panels ?? [],
  zoomCuts: brief.zoomCuts ?? autoZoom,
  zoomLevel: brief.zoomLevel ?? 1.12,
  sfx: brief.sfx ?? true,
  ...(brief.hook ? { hook: brief.hook } : {}),
  ...(brief.lowerThird ? { lowerThird: brief.lowerThird } : {}),
};

// Conferências que evitam retrabalho de render.
const warn = [];
for (const p of props.panels) {
  if (p.to > props.durationSeconds + 0.01) warn.push(`painel termina em ${p.to}s, depois do fim do vídeo (${props.durationSeconds}s)`);
  if (p.kind === "headline" || p.kind === "stat" || p.kind === "bullets") {
    if (props.hook && p.from < props.hook.to) warn.push(`painel de texto começa em ${p.from}s, sobreposto ao gancho (até ${props.hook.to}s)`);
  }
  if ((p.kind === "image" || p.kind === "video") && !p.source) warn.push(`painel ${p.kind} em ${p.from}s sem "source" (crédito)`);
}
if (captions.length === 0) warn.push("sem legendas: gere com transcrever.py ou legendas-aproximadas.mjs");
const lastWord = captions.length ? captions[captions.length - 1].endMs / 1000 : 0;
if (lastWord > props.durationSeconds + 0.3) warn.push(`legenda vai até ${lastWord.toFixed(1)}s, mas o vídeo tem ${props.durationSeconds}s (legenda feita antes do corte?)`);

writeFileSync(saida, JSON.stringify(props, null, 2));
console.log(`OK: ${saida} (${props.durationSeconds}s, ${captions.length} palavras, ${props.panels.length} painéis, ${props.zoomCuts.length} zooms)`);
for (const w of warn) console.warn("AVISO:", w);
