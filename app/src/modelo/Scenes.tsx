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

/** Rosca que enche até `value` % e conta o número no centro. */
const Pie: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { t } = useClock(scene);
  const d = scene.data as { value: number; at?: number; caption?: string[] };
  const at = d.at ?? scene.from + 0.3;
  const p = interpolate(t, [at, at + 1.1], [0, 1], { easing: M.out, ...clamp });
  const R = 170, C = 2 * Math.PI * R;
  return (
    <Area style={{ gap: 40 }}>
      <svg width={420} height={420} viewBox="-210 -210 420 420" style={{ flexShrink: 0 }}>
        <circle r={R} fill="none" stroke="#DADAD4" strokeWidth={64} />
        <circle r={R} fill="none" stroke={M.hero} strokeWidth={64} strokeDasharray={`${C * (d.value / 100) * p} ${C}`} transform="rotate(-90)" />
        <text textAnchor="middle" dominantBaseline="central" fontFamily={M.font} fontWeight={900} fontSize={100} letterSpacing="-0.03em" fill={M.ink}>{Math.round(d.value * p)}%</text>
      </svg>
      {d.caption ? (
        <div style={{ fontFamily: M.font, fontWeight: 900, fontSize: 112, lineHeight: 0.98, letterSpacing: "-0.03em", color: M.ink }}>
          {d.caption.map((l, i) => <div key={i} style={{ opacity: interpolate(t, [at + 0.2 + i * 0.2, at + 0.6 + i * 0.2], [0, 1], clamp) }}>{l}</div>)}
        </div>
      ) : null}
    </Area>
  );
};

/** Linha do tempo horizontal: cada marco acende no instante `at`. */
const Timeline: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { pop, t } = useClock(scene);
  const steps: { label: string; at: number }[] = scene.data?.steps ?? [];
  const W = 700, n = steps.length, xs = steps.map((_, i) => (n > 1 ? (i * W) / (n - 1) : W / 2));
  return (
    <Area>
      <div style={{ position: "relative", width: W, height: 420 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 206, height: 8, borderRadius: 4, background: "#DADAD4" }} />
        {steps.slice(1).map((s, i) => {
          const f = interpolate(t, [s.at - 0.4, s.at], [0, 1], { easing: M.out, ...clamp });
          return <div key={i} style={{ position: "absolute", left: xs[i], width: (xs[i + 1] - xs[i]) * f, top: 206, height: 8, borderRadius: 4, background: M.ink }} />;
        })}
        {steps.map((s, i) => {
          const p = pop(s.at, M.spring.snap);
          const last = i === n - 1, up = i % 2 === 0;
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: xs[i] - 24, top: 186, width: 48, height: 48, borderRadius: 999, background: last ? M.hero : M.ink, transform: `scale(${p})` }} />
              <div style={{ position: "absolute", left: xs[i] - 150, width: 300, top: up ? 60 : 262, textAlign: "center", fontFamily: M.font, fontWeight: 900, fontSize: 46, lineHeight: 1, letterSpacing: "-0.02em", color: last ? M.hero : M.ink, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [up ? 20 : -20, 0])}px)` }}>
                {s.label}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </Area>
  );
};

/** Balança: começa pendendo para a esquerda e, em `at`, vira para a direita (o lado de `right` pesa mais). */
const Scale: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { pop } = useClock(scene);
  const d = scene.data as { left: string; right: string; at: number };
  const k = pop(d.at, { damping: 9, stiffness: 120, mass: 1 });
  const ang = interpolate(k, [0, 1], [-9, 9]);
  const a = (ang * Math.PI) / 180, L = 640, cx = 450, cy = 120;
  const lx = cx - (L / 2) * Math.cos(a), ly = cy - (L / 2) * Math.sin(a);
  const rx = cx + (L / 2) * Math.cos(a), ry = cy + (L / 2) * Math.sin(a);
  const pan = (x: number, y: number, text: string, hot: boolean) => (
    <g>
      <line x1={x} y1={y} x2={x - 120} y2={y + 120} stroke={M.dim} strokeWidth={4} />
      <line x1={x} y1={y} x2={x + 120} y2={y + 120} stroke={M.dim} strokeWidth={4} />
      <rect x={x - 150} y={y + 120} width={300} height={100} rx={26} fill={hot ? M.hero : M.ink} />
      <text x={x} y={y + 170} textAnchor="middle" dominantBaseline="central" fontFamily={M.font} fontWeight={900} fontSize={46} letterSpacing="0.02em" fill="#fff">{text}</text>
    </g>
  );
  return (
    <Area>
      <svg width={900} height={460} viewBox="0 0 900 460">
        <rect x={cx - 10} y={cy} width={20} height={310} fill={M.ink} />
        <rect x={cx - 120} y={420} width={240} height={22} rx={11} fill={M.ink} />
        <line x1={lx} y1={ly} x2={rx} y2={ry} stroke={M.ink} strokeWidth={16} strokeLinecap="round" />
        {pan(lx, ly, d.left, k < 0.5)}
        {pan(rx, ry, d.right, k >= 0.5)}
        <circle cx={cx} cy={cy} r={26} fill={M.hero} />
      </svg>
    </Area>
  );
};

/** Lista com check: cada item é marcado no instante `at`. */
const Checklist: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { pop } = useClock(scene);
  const items: { text: string; at: number }[] = scene.data?.items ?? [];
  return (
    <Area>
      <div style={{ width: 900, background: M.card, borderRadius: 44, boxShadow: M.shadow, padding: "18px 44px" }}>
        {items.map((it, i) => {
          const slot = pop(scene.from + 0.1 + i * 0.12), c = pop(it.at, M.spring.stamp);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 36, height: 132, borderTop: i ? "2px solid #E4E4DF" : "none", opacity: slot }}>
              <div style={{ position: "relative", width: 76, height: 76, borderRadius: 22, border: `5px solid ${M.dim}`, flexShrink: 0 }}>
                <div style={{ position: "absolute", inset: -5, borderRadius: 22, background: M.hero, transform: `scale(${c})` }} />
                <svg viewBox="0 0 24 24" style={{ position: "absolute", inset: 8, width: 60, height: 60, opacity: c }}>
                  <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontFamily: M.font, fontWeight: 900, fontSize: 64, letterSpacing: "-0.02em", color: M.ink }}>{it.text}</span>
            </div>
          );
        })}
      </div>
    </Area>
  );
};

/** Número que conta de `from` até `to` a partir de `at`. */
const Counter: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { t, pop } = useClock(scene);
  const d = scene.data as { from: number; to: number; at: number; caption?: string; prefix?: string; suffix?: string };
  const p = interpolate(t, [d.at, d.at + 0.7], [0, 1], { easing: M.out, ...clamp });
  const cap = pop(d.at + 0.5);
  return (
    <Area style={{ flexDirection: "column", gap: 26 }}>
      <div style={{ fontFamily: M.font, fontWeight: 900, fontSize: 300, lineHeight: 1, letterSpacing: "-0.04em", color: p >= 1 ? M.hero : M.ink }}>
        {d.prefix}{Math.round(d.from + (d.to - d.from) * p)}{d.suffix}
      </div>
      {d.caption ? <div style={{ fontFamily: M.font, fontWeight: 900, fontSize: 80, letterSpacing: "-0.02em", color: M.ink, opacity: cap, transform: `translateY(${interpolate(cap, [0, 1], [24, 0])}px)` }}>{d.caption}</div> : null}
    </Area>
  );
};

/** Dois cartões lado a lado com um símbolo no meio ("=", "VS"); o da direita entra em `at`. */
const Versus: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { pop } = useClock(scene);
  const d = scene.data as { left: string; right: string; at: number; symbol?: string };
  const l = pop(scene.from + 0.1), r = pop(d.at, M.spring.snap), s = pop(d.at + 0.2, M.spring.stamp);
  const card = (text: string, dark: boolean, p: number): React.CSSProperties => ({ width: 420, height: 340, borderRadius: 44, background: dark ? M.ink : M.card, color: dark ? "#fff" : M.ink, boxShadow: M.shadow, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px 56px", fontFamily: M.font, fontWeight: 900, fontSize: 56, lineHeight: 1, letterSpacing: "-0.02em", opacity: p, transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)` });
  return (
    <Area style={{ gap: 0 }}>
      <div style={card(d.left, false, l)}>{d.left}</div>
      <div style={{ width: 120, height: 120, borderRadius: 999, background: M.hero, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: M.font, fontWeight: 900, fontSize: 64, margin: "0 -34px", zIndex: 2, transform: `scale(${s})` }}>{d.symbol ?? "="}</div>
      <div style={card(d.right, true, r)}>{d.right}</div>
    </Area>
  );
};

/** Troca de palavra: `from` é riscada em `at` e `to` entra no lugar. */
const Swap: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { pop, t } = useClock(scene);
  const d = scene.data as { from: string; to: string; at: number };
  const a = pop(scene.from + 0.1), b = pop(d.at, M.spring.stamp);
  const strike = interpolate(t, [d.at - 0.2, d.at + 0.1], [0, 1], { easing: M.out, ...clamp });
  return (
    <Area style={{ flexDirection: "column", gap: 10 }}>
      <div style={{ position: "relative", fontFamily: M.font, fontWeight: 900, fontSize: 150, letterSpacing: "-0.03em", color: M.dim, opacity: a * (1 - 0.4 * strike), transform: `translateY(${interpolate(a, [0, 1], [30, 0])}px)` }}>
        {d.from}
        <span style={{ position: "absolute", left: 0, top: "54%", height: 12, width: `${strike * 100}%`, background: M.hero, borderRadius: 6 }} />
      </div>
      <div style={{ fontFamily: M.font, fontWeight: 900, fontSize: 250, lineHeight: 1, letterSpacing: "-0.04em", color: M.hero, opacity: b, transform: `scale(${interpolate(b, [0, 1], [0.6, 1])})` }}>{d.to}</div>
    </Area>
  );
};

/** Comentário que recebe a resposta no direct (CTA). */
const Chat: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { pop } = useClock(scene);
  const d = scene.data as { comment: string; at: number; reply: string; replyAt: number };
  const c = pop(d.at, M.spring.snap), r = pop(d.replyAt, M.spring.snap);
  const tag: React.CSSProperties = { fontFamily: M.font, fontWeight: 700, fontSize: 24, letterSpacing: "0.2em", color: M.dim, marginBottom: 10 };
  const text: React.CSSProperties = { fontFamily: M.font, fontWeight: 800, fontSize: 58, letterSpacing: "-0.01em" };
  return (
    <Area style={{ flexDirection: "column", gap: 34, alignItems: "stretch" }}>
      <div style={{ alignSelf: "flex-start", background: M.card, borderRadius: 40, boxShadow: M.shadow, padding: "26px 44px 30px", opacity: c, transform: `translateY(${interpolate(c, [0, 1], [34, 0])}px)` }}>
        <div style={tag}>COMENTÁRIO</div>
        <div style={{ ...text, color: M.ink }}>{d.comment}</div>
      </div>
      <div style={{ alignSelf: "flex-end", background: M.hero, borderRadius: 40, boxShadow: M.shadow, padding: "26px 44px 30px", opacity: r, transform: `translateY(${interpolate(r, [0, 1], [34, 0])}px)` }}>
        <div style={{ ...tag, color: "#fff9" }}>MENSAGEM DIRETA</div>
        <div style={{ ...text, color: "#fff" }}>{d.reply}</div>
      </div>
    </Area>
  );
};

const table = { bigword: BigWord, duo: Duo, calendar: Calendar, boleto: Boleto, bars: Bars, line: Line, question: Question, pie: Pie, timeline: Timeline, scale: Scale, checklist: Checklist, counter: Counter, versus: Versus, swap: Swap, chat: Chat } as const;

export const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  const C = table[scene.kind];
  return (
    <Shell scene={scene}>
      <C scene={scene} />
    </Shell>
  );
};
