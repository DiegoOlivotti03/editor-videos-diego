import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Word } from "../types";
import { M } from "./style";

type Phrase = { words: Word[]; startMs: number; endMs: number };

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Frases curtas (até 4 palavras). Dentro da frase as palavras aparecem conforme são ditas. */
const phrases = (words: Word[], maxWords = 4, maxChars = 26, gapMs = 360): Phrase[] => {
  const out: Phrase[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) out.push({ words: cur, startMs: cur[0].startMs, endMs: cur[cur.length - 1].endMs });
    cur = [];
  };
  for (const w of words) {
    if (cur.length) {
      const prev = cur[cur.length - 1];
      const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
      if (cur.length >= maxWords || chars > maxChars || w.startMs - prev.endMs > gapMs || /[.!?…,]$/.test(prev.text)) flush();
    }
    cur.push(w);
  }
  flush();
  return out;
};

/** Legenda do modelo: caixa preta de cantos redondos, texto branco, palavra-chave em laranja. */
export const Captions: React.FC<{ words: Word[]; highlight: string[]; top: number; maxWords?: number; upper?: boolean }> = ({ words, highlight, top, maxWords = 4, upper = false }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const list = useMemo(() => phrases(words, maxWords, maxWords < 4 ? 22 : 26), [words, maxWords]);
  const hl = useMemo(() => new Set(highlight.map(norm)), [highlight]);
  const t = (frame / fps) * 1000;

  let idx = -1;
  for (let i = 0; i < list.length; i++) {
    const end = list[i + 1] ? Math.min(list[i].endMs + 260, list[i + 1].startMs - 30) : Infinity;
    if (t >= list[i].startMs - 30 && t < end) { idx = i; break; }
  }
  if (idx < 0) return null;
  const p = list[idx];
  const shown = p.words.filter((w) => t >= w.startMs - 30);
  if (!shown.length) return null;

  const startFrame = Math.round(((p.startMs - 30) / 1000) * fps);
  const enter = spring({ frame: frame - startFrame, fps, config: M.spring.snap });
  const last = p.words[p.words.length - 1];
  const fade = list[idx + 1] ? interpolate(t, [last.endMs + 120, last.endMs + 260], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;

  return (
    <div style={{ position: "absolute", left: 0, width, top, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div
        style={{
          background: "#0F0F11",
          borderRadius: 24,
          padding: "14px 34px 18px",
          fontFamily: M.font,
          fontWeight: 800,
          fontSize: 66,
          lineHeight: 1.05,
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
          color: "#fff",
          opacity: enter * fade,
          transform: `translateY(${interpolate(enter, [0, 1], [10, 0])}px) scale(${interpolate(enter, [0, 1], [0.96, 1])})`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        }}
      >
        {shown.map((w, i) => (
          <span key={i} style={{ color: hl.has(norm(w.text)) ? M.hero : "#fff" }}>
            {i ? " " : ""}
            {upper ? w.text.replace(/[.,;:!?…]+$/, "").toUpperCase() : w.text.replace(/[.,;:!?…]+$/, "")}
            {/[?!]$/.test(w.text) ? w.text.slice(-1) : ""}
          </span>
        ))}
      </div>
    </div>
  );
};
