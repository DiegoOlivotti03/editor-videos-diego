#!/usr/bin/env node
// MODO BÁSICO (sem Remotion): legenda dinâmica queimada direto no vídeo com ffmpeg + ASS.
// Palavra falada em destaque (cor + leve aumento), 2 a 3 palavras por vez, contorno grosso.
// Não faz tela dividida nem painéis; para isso use o template Remotion.
//
// Uso:
//   node legendas-ass.mjs captions.json saida.ass                       (só gera o .ass)
//   node legendas-ass.mjs captions.json saida.ass --video falas.mp4 --saida reel.mp4
// Opções: --y 1180  --size 88  --hero "#FFD23F"  --caps  --fonte "Montserrat"
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(["--y", "--size", "--hero", "--fonte", "--video", "--saida"]);
const pos = [];
for (let i = 0; i < args.length; i++) {
  if (VALUE_FLAGS.has(args[i])) i++;
  else if (!args[i].startsWith("--")) pos.push(args[i]);
}
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const [capsPath, assPath] = pos;
if (!capsPath || !assPath) {
  console.error("Uso: node legendas-ass.mjs captions.json saida.ass [--video falas.mp4 --saida reel.mp4] [--y 1180] [--size 88] [--hero '#FFD23F'] [--caps]");
  process.exit(1);
}
const y = Number(opt("y", 1180));
const size = Number(opt("size", 88));
const hero = String(opt("hero", "#FFD23F"));
const font = String(opt("fonte", "Montserrat"));
const caps = args.includes("--caps");

const words = JSON.parse(readFileSync(capsPath, "utf8"));

// mesma lógica de paginação do template Remotion
const pages = [];
let cur = [];
const flush = () => {
  if (cur.length) {
    pages.push({ words: cur, startMs: cur[0].startMs, endMs: cur[cur.length - 1].endMs });
    cur = [];
  }
};
for (const w of words) {
  if (cur.length) {
    const prev = cur[cur.length - 1];
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
    if (cur.length >= 3 || chars > 22 || w.startMs - prev.endMs > 380 || /[.!?…]$/.test(prev.text)) flush();
  }
  cur.push(w);
}
flush();

// ASS usa BGR: #RRGGBB -> &HBBGGRR&
const bgr = (hex) => {
  const h = hex.replace("#", "");
  return `&H${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}&`.toUpperCase();
};
const ts = (ms) => {
  const t = Math.max(0, Math.round(ms / 10));
  const cs = t % 100, s = Math.floor(t / 100) % 60, m = Math.floor(t / 6000) % 60, h = Math.floor(t / 360000);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};
const esc = (s) => s.replace(/[{}\\]/g, "");

const lines = [];
pages.forEach((page, pi) => {
  const nextStart = pages[pi + 1] ? pages[pi + 1].startMs - 40 : Infinity;
  const pageEnd = Math.min(page.endMs + 280, nextStart);
  page.words.forEach((w, wi) => {
    const start = wi === 0 ? Math.max(0, page.startMs - 40) : w.startMs;
    const nextW = page.words[wi + 1];
    const end = nextW ? nextW.startMs : pageEnd;
    if (end <= start) return;
    const text = page.words
      .map((x, xi) => {
        const t = caps ? esc(x.text).toUpperCase() : esc(x.text);
        return xi === wi
          ? `{\\1c${bgr(hero)}\\fscx106\\fscy106}${t}{\\1c&HFFFFFF&\\fscx100\\fscy100}`
          : t;
      })
      .join(" ");
    lines.push(`Dialogue: 0,${ts(start)},${ts(end)},Legenda,,0,0,0,,{\\an5\\pos(540,${y})}${text}`);
  });
});

const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Legenda,${font},${size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,-1,0,1,${Math.round(size * 0.1)},2,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${lines.join("\n")}
`;
writeFileSync(assPath, ass);
console.log(`OK: ${assPath} (${lines.length} eventos)`);

const video = opt("video");
const saida = opt("saida");
if (video && saida) {
  const r = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-y", "-i", video, "-vf", `ass=${assPath}`, "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-c:a", "copy", "-movflags", "+faststart", saida],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    console.error("ffmpeg falhou:\n", r.stderr);
    process.exit(1);
  }
  console.log(`OK: ${saida}`);
}
