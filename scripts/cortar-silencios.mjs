#!/usr/bin/env node
// Corta silêncios e pausas do vídeo bruto, padroniza para 1080x1920 / 30 fps e normaliza o áudio.
//
// Uso:
//   node cortar-silencios.mjs entrada.mp4 saida.mp4 [--noise -32] [--min 0.30] [--pad 0.07]
//                                                  [--no-norm] [--size 1080x1920] [--fps 30]
//
// Gera também saida.cuts.json com os trechos mantidos e os instantes dos cortes (joints),
// já na linha do tempo do vídeo cortado. Os joints alimentam o zoom de corte do Reel.
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(["--noise", "--min", "--pad", "--size", "--fps"]);
const pos = [];
for (let i = 0; i < args.length; i++) {
  if (VALUE_FLAGS.has(args[i])) i++; // pula o valor da flag
  else if (!args[i].startsWith("--")) pos.push(args[i]);
}
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const [input, output] = pos;
if (!input || !output) {
  console.error("Uso: node cortar-silencios.mjs entrada.mp4 saida.mp4 [--noise -32] [--min 0.30] [--pad 0.07] [--no-norm]");
  process.exit(1);
}
const noise = Number(opt("noise", -32));
const minSil = Number(opt("min", 0.3));
const pad = Number(opt("pad", 0.07));
const fps = Number(opt("fps", 30));
const [W, H] = String(opt("size", "1080x1920")).split("x").map(Number);
const norm = !args.includes("--no-norm");

const run = (cmd, a) => spawnSync(cmd, a, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

// 1) duração
const probe = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input]);
const total = parseFloat(probe.stdout);
if (!Number.isFinite(total)) {
  console.error("Não consegui ler a duração de", input, probe.stderr);
  process.exit(1);
}

// 2) detectar silêncios
const det = run("ffmpeg", [
  "-hide_banner", "-nostats", "-i", input,
  "-af", `silencedetect=noise=${noise}dB:d=${minSil}`,
  "-f", "null", "-",
]);
const silences = [];
let open = null;
for (const line of det.stderr.split("\n")) {
  const s = line.match(/silence_start:\s*(-?[\d.]+)/);
  const e = line.match(/silence_end:\s*(-?[\d.]+)/);
  if (s) open = Math.max(0, parseFloat(s[1]));
  if (e && open !== null) {
    silences.push([open, parseFloat(e[1])]);
    open = null;
  }
}
if (open !== null) silences.push([open, total]);

// 3) trechos de fala = complemento dos silêncios, com folga (pad) nas bordas
let speech = [];
let cursor = 0;
for (const [s, e] of silences) {
  if (s > cursor) speech.push([cursor, s]);
  cursor = Math.max(cursor, e);
}
if (cursor < total) speech.push([cursor, total]);
speech = speech
  .map(([s, e]) => [Math.max(0, s - pad), Math.min(total, e + pad)])
  .filter(([s, e]) => e - s >= 0.15);
// funde trechos que a folga fez encostar
const merged = [];
for (const seg of speech) {
  const last = merged[merged.length - 1];
  if (last && seg[0] <= last[1]) last[1] = Math.max(last[1], seg[1]);
  else merged.push([...seg]);
}
if (merged.length === 0) merged.push([0, total]);

// 4) montar o filtro e renderizar
const lines = [];
merged.forEach(([s, e], i) => {
  lines.push(`[0:v]trim=start=${s.toFixed(3)}:end=${e.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`);
  lines.push(`[0:a]atrim=start=${s.toFixed(3)}:end=${e.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`);
});
const inputs = merged.map((_, i) => `[v${i}][a${i}]`).join("");
lines.push(`${inputs}concat=n=${merged.length}:v=1:a=1[vc][ac]`);
lines.push(
  `[vc]fps=${fps},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,format=yuv420p[vout]`,
);
lines.push(norm ? `[ac]loudnorm=I=-16:TP=-1.5:LRA=11[aout]` : `[ac]anull[aout]`);

const dir = mkdtempSync(join(tmpdir(), "cortes-"));
const scriptPath = join(dir, "filtro.txt");
writeFileSync(scriptPath, lines.join(";\n"));

const enc = run("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y", "-i", input,
  "-filter_complex_script", scriptPath,
  "-map", "[vout]", "-map", "[aout]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
  "-movflags", "+faststart",
  output,
]);
if (enc.status !== 0) {
  console.error("ffmpeg falhou:\n", enc.stderr);
  process.exit(1);
}

// 5) duração final e joints (instantes dos cortes no vídeo novo)
const probe2 = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", output]);
const outDur = parseFloat(probe2.stdout);
const joints = [];
let acc = 0;
merged.forEach(([s, e], i) => {
  acc += e - s;
  if (i < merged.length - 1) joints.push(Number(acc.toFixed(3)));
});

const report = {
  source: input,
  output,
  originalDuration: Number(total.toFixed(3)),
  duration: Number(outDur.toFixed(3)),
  removedSeconds: Number((total - outDur).toFixed(3)),
  segments: merged.map(([s, e]) => ({ start: Number(s.toFixed(3)), end: Number(e.toFixed(3)) })),
  joints,
};
writeFileSync(output.replace(/\.[^.]+$/, "") + ".cuts.json", JSON.stringify(report, null, 2));
console.log(
  `OK: ${report.originalDuration}s -> ${report.duration}s (${report.segments.length} trechos, ${joints.length} cortes, -${report.removedSeconds}s)`,
);
