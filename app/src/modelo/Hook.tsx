import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { M } from "./style";
import type { Hook } from "./types";

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Quebra o título em 1 a 3 linhas equilibradas, para a altura da caixa ser previsível. */
export const hookLayout = (text: string) => {
  const t = text.trim().toUpperCase();
  const words = t.split(/\s+/);
  const n = t.length <= 18 ? 1 : t.length <= 40 ? 2 : 3;
  const target = Math.ceil(t.length / n);
  const lines: string[][] = [[]];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    const len = cur.join(" ").length;
    if (cur.length && len + 1 + w.length > target && lines.length < n) lines.push([w]);
    else cur.push(w);
  }
  const strs = lines.map((l) => l.join(" "));
  const maxChars = Math.max(...strs.map((s) => s.length));
  const size = Math.round(Math.min(88, 880 / (maxChars * 0.66)));
  const lineH = Math.round(size * 1.06);
  const height = lines.length * lineH + 44;
  return { lines: lines.map((l) => l), size, lineH, height };
};

export const HOOK_DEFAULT_TO = 4.5;
/** O título fica um pouco abaixo da emenda para não tapar a base dos painéis. */
export const HOOK_DROP = 64;

/** Quanto o título está visível (0 a 1) no instante `t` (segundos), com 0,25 s de entrada e de saída. */
export const hookVisibility = (hook: Hook | undefined, t: number) => {
  if (!hook) return 0;
  const from = hook.from ?? 0;
  const to = hook.to ?? HOOK_DEFAULT_TO;
  return interpolate(t, [from, from + 0.25, to - 0.25, to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};

/** Título-tese em caixa colorida, centrado na emenda entre painel e pessoa (estilo "gancho com número"). */
export const HookTitle: React.FC<{ hook: Hook; seamY: number }> = ({ hook, seamY }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const from = hook.from ?? 0;
  const vis = hookVisibility(hook, frame / fps);
  if (vis <= 0) return null;
  const enter = spring({ frame: frame - Math.round(from * fps), fps, config: M.spring.snap });
  const { lines, size, lineH, height } = hookLayout(hook.text);
  const hl = new Set((hook.highlight ?? []).map(norm));
  return (
    <div style={{ position: "absolute", left: 0, width, top: seamY - height / 2, display: "flex", justifyContent: "center", pointerEvents: "none", opacity: vis }}>
      <div
        style={{
          background: M.hero,
          borderRadius: 16,
          padding: "22px 44px",
          fontFamily: M.font,
          fontWeight: 900,
          fontSize: size,
          lineHeight: `${lineH}px`,
          letterSpacing: "-0.015em",
          textAlign: "center",
          color: "#fff",
          boxShadow: "0 14px 40px rgba(0,0,0,0.28)",
          transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px) scale(${interpolate(enter, [0, 1], [0.94, 1])})`,
        }}
      >
        {lines.map((l, i) => (
          <div key={i} style={{ whiteSpace: "nowrap" }}>
            {l.map((w, j) => (
              <span key={j} style={{ color: hl.has(norm(w)) ? M.ink : "#fff" }}>
                {j ? " " : ""}
                {w}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
