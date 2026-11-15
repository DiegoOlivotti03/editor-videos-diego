import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import "../modelo/fonts";
import { M } from "../modelo/style";

export type YtIntroProps = { kicker: string; title: string; subtitle: string; from: string; to: string; note: string };
export type YtTagProps = { label: string; sub?: string };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const serif = '"Liberation Serif", "Times New Roman", Georgia, serif';

/** Cartão de abertura (16:9): título grande, subtítulo e a meta do dia com o número virando. */
export const YtIntro: React.FC<YtIntroProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = (at: number, cfg: object = M.spring.soft) => spring({ frame: frame - Math.round(at * fps), fps, config: cfg as never });
  const k = pop(0.1), t = pop(0.25, M.spring.snap), s = pop(0.55), n = pop(0.9), glow = interpolate(frame, [0, 60], [0.5, 1], clamp);
  const flip = interpolate(frame, [Math.round(2.3 * fps), Math.round(2.9 * fps)], [0, 1], { easing: M.out, ...clamp });
  const out = interpolate(frame, [4.6 * fps, 5 * fps], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: "#0E0E10", fontFamily: M.font, opacity: out }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 70% at 80% 0%, ${M.hero}${Math.round(120 * glow).toString(16).padStart(2, "0")}, transparent 70%)` }} />
      <div style={{ position: "absolute", left: 140, top: 190 }}>
        <div style={{ fontWeight: 800, fontSize: 34, letterSpacing: "0.28em", color: M.hero, textTransform: "uppercase", opacity: k, transform: `translateX(${interpolate(k, [0, 1], [-30, 0])}px)` }}>— {p.kicker}</div>
        <div style={{ marginTop: 26, fontWeight: 900, fontSize: 250, lineHeight: 0.92, letterSpacing: "-0.04em", color: "#fff", textTransform: "uppercase", opacity: t, transform: `translateY(${interpolate(t, [0, 1], [60, 0])}px)` }}>{p.title}</div>
        <div style={{ marginTop: 14, fontWeight: 700, fontSize: 66, letterSpacing: "0.02em", color: "#E7E7E2", opacity: s, transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)` }}>{p.subtitle}</div>
      </div>
      <div style={{ position: "absolute", left: 140, bottom: 150, display: "flex", alignItems: "baseline", gap: 30, opacity: n, transform: `translateY(${interpolate(n, [0, 1], [30, 0])}px)` }}>
        <div style={{ fontWeight: 800, fontSize: 34, letterSpacing: "0.22em", color: "#8D8D88", textTransform: "uppercase" }}>{p.note}</div>
        <div style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 700, fontSize: 120, color: M.hero, position: "relative", width: 300, height: 120 }}>
          <span style={{ position: "absolute", left: 0, opacity: 1 - flip, transform: `translateY(${-flip * 40}px)` }}>{p.from}</span>
          <span style={{ position: "absolute", left: 0, opacity: flip, transform: `translateY(${(1 - flip) * 40}px)` }}>{p.to}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Etiqueta de capítulo no canto inferior esquerdo, com fundo transparente (exportada em sequência de PNG). */
export const YtTag: React.FC<YtTagProps> = ({ label, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = spring({ frame, fps, config: M.spring.snap });
  const out = interpolate(frame, [3.1 * fps, 3.5 * fps], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ fontFamily: M.font, opacity: out }}>
      <div style={{ position: "absolute", left: 90, bottom: 110, transform: `translateX(${interpolate(e, [0, 1], [-60, 0])}px)`, opacity: e, display: "flex", alignItems: "stretch", boxShadow: "0 14px 40px rgba(0,0,0,0.35)" }}>
        <div style={{ width: 14, background: M.hero }} />
        <div style={{ background: "rgba(14,14,16,0.88)", padding: "18px 34px 20px" }}>
          <div style={{ fontWeight: 900, fontSize: 56, letterSpacing: "0.02em", color: "#fff", textTransform: "uppercase", lineHeight: 1 }}>{label}</div>
          {sub ? <div style={{ marginTop: 8, fontWeight: 600, fontSize: 28, letterSpacing: "0.2em", color: M.hero, textTransform: "uppercase" }}>{sub}</div> : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};
