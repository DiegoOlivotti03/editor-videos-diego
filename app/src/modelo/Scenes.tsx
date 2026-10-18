import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { M } from "./style";
import type { Scene } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Tempo e mola relativos ao início do painel; `at` é um instante absoluto em segundos. */
const useClock = (scene: Scene) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps + scene.from;
  const pop = (at: number, config: object = M.spring.soft) =>
    spring({ frame: frame - Math.round((at - scene.from) * fps), fps, config: config as never });
  return { frame, fps, t, pop };
};

const LABEL_Y = 290;
const AREA_TOP = 350;
const AREA_H = 500;

const Label: React.FC<{ text?: string }> = ({ text }) =>
  text ? (
    <div style={{ position: "absolute", top: LABEL_Y, left: 0, right: 0, textAlign: "center", fontFamily: M.font, fontWeight: 600, fontSize: 28, letterSpacing: "0.3em", color: M.dim, textTransform: "uppercase" }}>
      {text}
    </div>
  ) : null;

const Area: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top: AREA_TOP, height: AREA_H, display: "flex", alignItems: "center", justifyContent: "center", ...style }}>{children}</div>
);

/** Entrada e saída suaves do painel inteiro (fade + 14 px de subida). A saída sobrepõe a entrada do próximo. */
const Shell: React.FC<{ scene: Scene; children: React.ReactNode }> = ({ scene, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = Math.round((scene.to - scene.from) * fps);
  const enter = interpolate(frame, [0, 12], [0, 1], { easing: M.out, ...clamp });
  const exit = interpolate(frame, [len - 2, len + 8], [0, 1], { easing: M.in, ...clamp });
  return (
    <AbsoluteFill style={{ opacity: enter * (1 - exit), transform: `translateY(${interpolate(enter, [0, 1], [16, 0])}px)` }}>
      <Label text={scene.label} />
      {children}
    </AbsoluteFill>
  );
};

const BigWord: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { pop } = useClock(scene);
  const lines: { text: string; accent?: boolean }[] = scene.data?.lines ?? [];
  const size = scene.data?.size ?? 150;
  return (
    <Area>
      <div style={{ textAlign: "center", fontFamily: M.font, fontWeight: 900, fontSize: size, lineHeight: 0.98, letterSpacing: "-0.03em", color: M.ink }}>
        {lines.map((l, i) => {
          const p = pop(scene.from + 0.12 + i * 0.18);
          return (
            <div key={i} style={{ color: l.accent ? M.hero : M.ink, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [34, 0])}px)` }}>
              {l.text}
            </div>
          );
        })}
      </div>
    </Area>
  );
};

const Duo: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { pop } = useClock(scene);
  const items: { value: string; at: number }[] = scene.data?.items ?? [];
  return (
    <Area style={{ gap: 44 }}>
      {items.map((it, i) => {
        const p = pop(it.at, M.spring.snap);
        const slot = pop(scene.from + 0.1 + i * 0.12);
        return (
          <div key={i} style={{ position: "relative", width: 400, height: 420 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 44, border: `4px dashed ${M.dim}55`, opacity: slot * (1 - p) }} />
          <div
            style={{
              width: 400, height: 420, borderRadius: 44, background: M.card, boxShadow: M.shadow,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: M.font, fontWeight: 900, fontSize: 250, letterSpacing: "-0.04em", color: M.ink,
              opacity: p, transform: `translateY(${interpolate(p, [0, 1], [50, 0])}px) scale(${interpolate(p, [0, 1], [0.92, 1])})`,
            }}
          >
            {it.value}
          </div>
          </div>
        );
      })}
    </Area>
  );
};

const Calendar: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { pop, t } = useClock(scene);
  const { month, firstWeekday, days, mark } = scene.data as { month: string; firstWeekday: number; days: number; mark: number; at: number };
  const at: number = scene.data?.at ?? scene.from + 0.6;
  const mp = pop(at, M.spring.stamp);
  const dim = interpolate(t, [at, at + 0.4], [0, 1], { easing: M.out, ...clamp });
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const cell = 104;
  return (
    <Area>
      <div style={{ background: M.card, borderRadius: 44, boxShadow: M.shadow, padding: "28px 36px 24px", width: cell * 7 + 72 }}>
        <div style={{ fontFamily: M.font, fontWeight: 800, fontSize: 38, letterSpacing: "0.18em", color: M.ink, marginBottom: 14 }}>{month}</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(7, ${cell}px)`, rowGap: 6 }}>
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <div key={i} style={{ height: 46, textAlign: "center", fontFamily: M.font, fontWeight: 700, fontSize: 26, color: M.dim }}>{d}</div>
          ))}
          {cells.map((d, i) => {
            const isMark = d === mark;
            const before = d !== null && d < mark;
            return (
              <div key={i} style={{ height: 62, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {isMark ? (
                  <div style={{ position: "absolute", width: 62, height: 62, borderRadius: 999, background: M.hero, transform: `scale(${interpolate(mp, [0, 1], [0, 1])})` }} />
                ) : null}
                {d !== null ? (
                  <span style={{ position: "relative", fontFamily: M.font, fontWeight: isMark ? 900 : 700, fontSize: 32, color: isMark && mp > 0.35 ? "#fff" : M.ink, opacity: before ? 1 - 0.65 * dim : 1 }}>{d}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </Area>
  );
};

const barcode = Array.from({ length: 46 }, (_, i) => 3 + ((i * 7 + (i % 5) * 3) % 9));

const Boleto: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { pop, t } = useClock(scene);
  const d = scene.data as { strikeAt: number; youAt: number };
  const strike = interpolate(t, [d.strikeAt, d.strikeAt + 0.3], [0, 1], { easing: M.out, ...clamp });
  const you = pop(d.youAt, M.spring.stamp);
  const row: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", height: 92, padding: "0 36px", fontFamily: M.font, fontWeight: 800, fontSize: 44, letterSpacing: "0.04em" };
  return (
    <Area>
      <div style={{ width: 900, background: M.card, borderRadius: 44, boxShadow: M.shadow, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "30px 36px 18px" }}>
          <span style={{ fontFamily: M.font, fontWeight: 900, fontSize: 46, letterSpacing: "0.16em", color: M.ink }}>BOLETO</span>
          <span style={{ fontFamily: M.font, fontWeight: 800, fontSize: 24, letterSpacing: "0.18em", color: M.hero, border: `3px solid ${M.hero}`, borderRadius: 999, padding: "6px 20px" }}>EM ABERTO</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 86, padding: "0 36px 14px" }}>
          {barcode.map((h, i) => (
            <div key={i} style={{ width: 5 + (i % 3), height: 30 + h * 5, background: M.ink, borderRadius: 1 }} />
          ))}
        </div>
        <div style={{ height: 2, background: "#E4E4DF", margin: "0 36px" }} />
        <div style={{ ...row, color: M.dim }}>
          <span style={{ position: "relative" }}>
            ELES
            <span style={{ position: "absolute", left: 0, top: "52%", height: 6, width: `${strike * 100}%`, background: M.hero, borderRadius: 3 }} />
          </span>
          <span style={{ fontWeight: 600, fontSize: 28, letterSpacing: "0.18em", opacity: 1 - strike * 0.6 }}>POLÍTICOS</span>
        </div>
        <div style={{ ...row, background: `rgba(232,69,44,${0.12 * you})`, color: M.ink }}>
          <span style={{ color: you > 0.2 ? M.hero : M.dim, transform: `scale(${interpolate(you, [0, 1], [1.5, 1])}) rotate(${interpolate(you, [0, 1], [-6, 0])}deg)`, transformOrigin: "left center", display: "inline-block", fontWeight: 900, fontSize: 56, opacity: you }}>VOCÊ</span>
          <span style={{ fontWeight: 600, fontSize: 28, letterSpacing: "0.18em", color: M.dim, opacity: you }}>PAGA</span>
        </div>
      </div>
    </Area>
  );
};

const Bars: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { t } = useClock(scene);
  const at: number = scene.data?.at ?? scene.from + 0.8;
  const targets: number[] = scene.data?.targets ?? [0.85, 0.7, 0.5, 0.3, 0.14, 0.05];
  return (
    <Area>
      <div style={{ background: M.card, borderRadius: 44, boxShadow: M.shadow, padding: "32px 44px 34px", width: 900 }}>
        <div style={{ fontFamily: M.font, fontWeight: 800, fontSize: 30, letterSpacing: "0.2em", color: M.ink, marginBottom: 22 }}>AMIZADES</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 340 }}>
          {targets.map((target, i) => {
            const grow = interpolate(t, [scene.from + 0.05 * i, scene.from + 0.05 * i + 0.5], [0, 1], { easing: M.out, ...clamp });
            const drop = interpolate(t, [at + i * 0.12, at + i * 0.12 + 0.55], [0, 1], { easing: M.out, ...clamp });
            const h = interpolate(grow, [0, 1], [0, 0.92]) * (1 - drop) + target * drop * grow;
            const last = i === targets.length - 1;
            return <div key={i} style={{ width: 96, height: 340 * h, borderRadius: 18, background: last && drop > 0.5 ? M.hero : M.ink }} />;
          })}
        </div>
        <div style={{ height: 3, background: "#E4E4DF", marginTop: 0 }} />
      </div>
    </Area>
  );
};

const Line: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { t } = useClock(scene);
  const W = 820, H = 340;
  const pts = [[0, 0.18], [0.14, 0.2], [0.28, 0.15], [0.42, 0.3], [0.58, 0.5], [0.72, 0.62], [0.86, 0.84], [1, 0.96]].map(([x, y]) => [x * W, y * H]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const draw = interpolate(t, [scene.from + 0.15, scene.to - 0.1], [0, 1], { easing: M.out, ...clamp });
  const end = pts[pts.length - 1];
  return (
    <Area>
      <div style={{ background: M.card, borderRadius: 44, boxShadow: M.shadow, padding: "40px 44px 34px", width: 900 }}>
        <svg width={W} height={H + 20} viewBox={`0 -10 ${W} ${H + 20}`} style={{ display: "block" }}>
          {[0, 0.33, 0.66, 1].map((g, i) => <line key={i} x1={0} x2={W} y1={g * H} y2={g * H} stroke="#E4E4DF" strokeWidth={2} />)}
          <path d={d} fill="none" stroke={M.ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          <circle cx={end[0]} cy={end[1]} r={17} fill={M.hero} opacity={interpolate(draw, [0.92, 1], [0, 1], clamp)} />
        </svg>
      </div>
    </Area>
  );
};

const Question: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { pop } = useClock(scene);
  const d = scene.data as { items: { value: string; at: number }[]; qAt: number };
  const l1 = pop(scene.from + 0.1), l2 = pop(scene.from + 0.35), q = pop(d.qAt, M.spring.stamp);
  const line = (p: number): React.CSSProperties => ({ opacity: p, transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)` });
  return (
    <Area style={{ flexDirection: "column", gap: 34 }}>
      <div style={{ textAlign: "center", fontFamily: M.font, fontWeight: 900, fontSize: 112, lineHeight: 0.98, letterSpacing: "-0.03em", color: M.ink }}>
        <div style={line(l1)}>QUEM SEGURA</div>
        <div style={line(l2)}>A TUA <span style={{ color: M.hero }}>MÃO?</span></div>
      </div>
      <div style={{ display: "flex", gap: 34, alignItems: "center" }}>
        {d.items.map((it, i) => {
          const p = pop(it.at, M.spring.snap);
          return (
            <div key={i} style={{ width: 250, height: 170, borderRadius: 34, background: M.card, boxShadow: M.shadow, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: M.font, fontWeight: 900, fontSize: 110, color: M.ink, letterSpacing: "-0.03em", opacity: p, transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)` }}>
              {it.value}
              <span style={{ color: M.hero, marginLeft: 6, opacity: q, transform: `scale(${interpolate(q, [0, 1], [2, 1])})`, display: "inline-block" }}>?</span>
            </div>
          );
        })}
      </div>
    </Area>
  );
};

const table = { bigword: BigWord, duo: Duo, calendar: Calendar, boleto: Boleto, bars: Bars, line: Line, question: Question } as const;

export const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  const C = table[scene.kind];
  return (
    <Shell scene={scene}>
      <C scene={scene} />
    </Shell>
  );
};
