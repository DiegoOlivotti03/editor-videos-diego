#!/usr/bin/env node
// PLANO B de legenda: distribui as palavras de um texto ao longo da duração do vídeo.
// A sincronia é aproximada (proporcional ao tamanho das palavras e às pausas de pontuação).
// Para sincronia exata, use transcrever.py (Whisper). Só use este quando não houver transcrição.
//
// Uso: node legendas-aproximadas.mjs roteiro.txt video_cortado.mp4 captions.json
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const [textoPath, videoPath, saida] = process.argv.slice(2);
if (!textoPath || !videoPath || !saida) {
  console.error("Uso: node legendas-aproximadas.mjs roteiro.txt video_cortado.mp4 captions.json");
  process.exit(1);
}

const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", videoPath], { encoding: "utf8" });
const dur = parseFloat(probe.stdout);
if (!Number.isFinite(dur)) {
  console.error("Não consegui ler a duração do vídeo.");
  process.exit(1);
}

const words = readFileSync(textoPath, "utf8").split(/\s+/).filter(Boolean);
// peso = caracteres + pausa por pontuação
const weight = (w) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 2 + (/[.!?…]$/.test(w) ? 5 : /[,;:]$/.test(w) ? 2.5 : 0);
const weights = words.map(weight);
const sum = weights.reduce((a, b) => a + b, 0);

const lead = Math.min(0.15, dur * 0.02);
const span = Math.max(0.1, dur - lead - 0.1);
let t = lead;
const out = words.map((text, i) => {
  const d = (weights[i] / sum) * span;
  const startMs = Math.round(t * 1000);
  t += d;
  // a pausa de pontuação é silêncio depois da palavra, não parte dela
  const spoken = d * (/[.!?…,;:]$/.test(text) ? 0.7 : 0.95);
  return { text, startMs, endMs: Math.round((t - d + spoken) * 1000) };
});

writeFileSync(saida, JSON.stringify(out, null, 2));
console.error(`AVISO: sincronia aproximada (${words.length} palavras em ${dur.toFixed(1)}s). Confira cada trecho nos frames.`);
console.log(`OK: ${saida}`);
