import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
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

/** Imagens reais (escudo, bandeira, foto) lado a lado; cada uma entra em `at`. `frame: true` põe cantos arredondados e sombra (fotos, bandeiras). */
const Pics: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { pop, t } = useClock(scene);
  const items: { src: string; at: number; label?: string; frame?: boolean }[] = scene.data?.items ?? [];
  const badge = scene.data?.badge as { text: string; at: number } | undefined;
  const h: number = scene.data?.height ?? (items.length > 1 ? 280 : 440);
  const drift = 1 + 0.05 * Math.min(1, (t - scene.from) / Math.max(0.1, scene.to - scene.from));
  const bp = badge ? pop(badge.at, M.spring.stamp) : 0;
  return (
    <Area style={{ gap: 40, alignItems: "center" }}>
      {items.map((it, i) => {
        const p = pop(it.at, M.spring.snap);
        return (
          <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 22, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px) scale(${interpolate(p, [0, 1], [0.92, 1]) * drift})` }}>
            <Img src={staticFile(it.src)} style={{ height: h, width: "auto", maxWidth: 900 / Math.max(1, items.length) - 20, objectFit: "contain", ...(it.frame ? { borderRadius: 28, boxShadow: M.shadow } : { filter: "drop-shadow(0 14px 30px rgba(20,20,20,0.18))" }) }} />
            {it.label ? <div style={{ fontFamily: M.font, fontWeight: 900, fontSize: 44, letterSpacing: "0.04em", color: M.ink }}>{it.label}</div> : null}
            {i === 0 && badge ? (
              <div style={{ position: "absolute", right: -70, top: 10, background: M.hero, color: "#fff", fontFamily: M.font, fontWeight: 900, fontSize: 96, letterSpacing: "-0.03em", padding: "6px 34px 10px", borderRadius: 34, boxShadow: M.shadow, transform: `scale(${bp}) rotate(${interpolate(bp, [0, 1], [-10, -4])}deg)` }}>{badge.text}</div>
            ) : null}
          </div>
        );
      })}
    </Area>
  );
};

/** Boneco de palito. `leg` e `arm` em graus (balanço); `face` = 1 olha para a direita, -1 para a esquerda. */
const Stick: React.FC<{ x: number; y: number; face?: 1 | -1; leg?: number; arm?: number; color?: string; lean?: number }> = ({ x, y, face = 1, leg = 0, arm = 0, color = M.ink, lean = 0 }) => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const hip = { x: 0, y: 0 }, neck = { x: Math.sin(rad(lean)) * 110, y: -Math.cos(rad(lean)) * 110 };
  const limb = (from: { x: number; y: number }, len: number, ang: number) => ({ x: from.x + Math.sin(rad(ang)) * len * face, y: from.y + Math.cos(rad(ang)) * len });
  const l1 = limb(hip, 120, 12 + leg), l2 = limb(hip, 120, -12 - leg * 0.4);
  const a1 = limb(neck, 90, 40 + arm), a2 = limb(neck, 90, -40 - arm);
  const ln = (p: { x: number; y: number }, from = { x: 0, y: 0 }) => <line x1={from.x} y1={from.y} x2={p.x} y2={p.y} stroke={color} strokeWidth={14} strokeLinecap="round" />;
  return (
    <g transform={`translate(${x} ${y})`}>
      {ln(neck, hip)}{ln(l1)}{ln(l2)}{ln(a1, neck)}{ln(a2, neck)}
      <circle cx={neck.x + Math.sin(rad(lean)) * 38} cy={neck.y - Math.cos(rad(lean)) * 38} r={38} fill={M.bg} stroke={color} strokeWidth={14} />
    </g>
  );
};

/** Dois bonecos passando a bola (futebol). A bola vai e volta a cada `period` s. */
const Kick: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { t, pop } = useClock(scene);
  const d = scene.data as { period?: number };
  const P = d?.period ?? 1.1, e = pop(scene.from + 0.05);
  const ph = ((t - scene.from) / P) % 2, go = ph < 1, u = go ? ph : ph - 1;
  const A = 190, B = 710, gy = 320;
  const bx = go ? A + 60 + (B - A - 120) * u : B - 60 - (B - A - 120) * u;
  const by = gy - 20 - Math.sin(Math.PI * u) * 140;
  const kickA = go ? Math.max(0, 1 - u * 5) * 55 : 0, kickB = !go ? Math.max(0, 1 - u * 5) * 55 : 0;
  return (
    <Area>
      <svg width={900} height={460} viewBox="0 0 900 460" style={{ opacity: e, transform: `translateY(${interpolate(e, [0, 1], [30, 0])}px)` }}>
        <line x1={40} y1={gy + 130} x2={860} y2={gy + 130} stroke={M.dim} strokeWidth={6} strokeLinecap="round" opacity={0.5} />
        <Stick x={A} y={gy} face={1} leg={kickA} arm={kickA * 0.4} lean={kickA * 0.15} />
        <Stick x={B} y={gy} face={-1} leg={kickB} arm={kickB * 0.4} lean={-kickB * 0.15} color={M.hero} />
        <ellipse cx={bx} cy={gy + 128} rx={26 - Math.sin(Math.PI * u) * 8} ry={7} fill="#17171A" opacity={0.18} />
        <g transform={`translate(${bx} ${by + 112}) rotate(${(t - scene.from) * 540})`}>
          <circle r={30} fill="#fff" stroke={M.ink} strokeWidth={6} />
          <polygon points="0,-13 12,-4 7,11 -7,11 -12,-4" fill={M.ink} />
        </g>
      </svg>
    </Area>
  );
};

/** Dois bonecos discutindo: um aprova (✓) em `at`, o outro reprova (✕) em `at2`. */
const Debate: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { t, pop } = useClock(scene);
  const d = scene.data as { at: number; at2: number; left?: string; right?: string };
  const e = pop(scene.from + 0.05), b1 = pop(d.at, M.spring.stamp), b2 = pop(d.at2, M.spring.stamp);
  const bob = (k: number) => Math.sin((t - scene.from) * 6 + k) * 4;
  const bubble = (x: number, p: number, ok: boolean) => (
    <g transform={`translate(${x} 80) scale(${p})`} opacity={p}>
      <rect x={-90} y={-70} width={180} height={140} rx={40} fill={ok ? "#2E9E5B" : M.hero} />
      <polygon points="-18,68 18,68 0,98" fill={ok ? "#2E9E5B" : M.hero} />
      {ok ? <path d="M-42 4l28 28 56-62" fill="none" stroke="#fff" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" /> : <path d="M-36 -36l72 72M36 -36l-72 72" fill="none" stroke="#fff" strokeWidth={18} strokeLinecap="round" />}
    </g>
  );
  return (
    <Area>
      <svg width={900} height={460} viewBox="0 0 900 460" style={{ opacity: e }}>
        <line x1={40} y1={455} x2={860} y2={455} stroke={M.dim} strokeWidth={6} strokeLinecap="round" opacity={0.5} />
        {bubble(250, b1, true)}
        {bubble(650, b2, false)}
        <Stick x={250} y={335 + bob(0)} face={1} arm={b1 > 0.5 ? 70 : 0} />
        <Stick x={650} y={335 + bob(2)} face={-1} arm={b2 > 0.5 ? 70 : 0} color={M.hero} />
      </svg>
    </Area>
  );
};

/** Mascote: a Bolinha. `mood` muda o rosto e o acessório; `t` é o tempo em s para os movimentos. */
const Bolinha: React.FC<{ mood: "olhando" | "empresario" | "estudando" | "quebrando" | "feliz"; t: number; size?: number; crack?: number }> = ({ mood, t, size = 340, crack = 0 }) => {
  const look = Math.sin(t * 2.2) * 9;
  const blink = Math.sin(t * 1.3) > 0.97 ? 0.1 : 1;
  const sad = mood === "quebrando";
  const mouth = sad ? "M-34 62 Q0 30 34 62" : mood === "olhando" ? "M-14 52 Q0 66 14 52" : "M-36 44 Q0 82 36 44";
  const tilt = sad ? Math.sin(t * 9) * 2 * crack : Math.sin(t * 3) * 3;
  return (
    <svg width={size} height={size * 1.15} viewBox="-150 -130 300 345" style={{ overflow: "visible" }}>
      <ellipse cx={0} cy={168} rx={90} ry={11} fill="#17171A" opacity={0.14} />
      <g transform={`rotate(${tilt})`}>
        <circle r={105} fill="#fff" stroke={M.ink} strokeWidth={10} />
        <polygon points="0,-102 22,-86 14,-62 -14,-62 -22,-86" fill={M.ink} />
        <g transform={`translate(58 -112) rotate(${Math.sin(t * 2) * 8})`}>
          <path d="M0 18 Q-4 4 0 -6" stroke="#2E9E5B" strokeWidth={5} fill="none" strokeLinecap="round" />
          {[0, 90, 180, 270].map((a) => <ellipse key={a} cx={0} cy={-18} rx={9} ry={13} fill="#2E9E5B" transform={`translate(0 6) rotate(${a} 0 0) translate(0 -2)`} />)}
        </g>
        <polygon points="-96,-34 -78,-52 -62,-34 -70,-12 -92,-12" fill={M.ink} />
        <polygon points="96,-34 78,-52 62,-34 70,-12 92,-12" fill={M.ink} />
        {[-34, 34].map((x, i) => (
          <g key={i} transform={`translate(${x} -12) scale(1 ${blink})`}>
            <circle r={25} fill="#fff" stroke={M.ink} strokeWidth={6} />
            <circle cx={look * (mood === "olhando" ? 1.6 : 0.6)} cy={mood === "estudando" ? 8 : 0} r={11} fill={M.ink} />
          </g>
        ))}
        <path d={mouth} fill="none" stroke={M.ink} strokeWidth={7} strokeLinecap="round" />
        {sad ? (
          <>
            <path d="M-8 -104 L10 -70 L-6 -50 L14 -20 L-4 6 L16 40 L2 70 L12 102" fill="none" stroke={M.hero} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - crack} />
            <path d="M70 -50 q12 22 0 30 q-12 -8 0 -30z" fill="#6AB7FF" opacity={0.9} transform={`translate(0 ${(t * 40) % 50})`} />
          </>
        ) : null}
        {mood === "empresario" ? <polygon points="-12,104 12,104 18,150 0,166 -18,150" fill={M.hero} /> : null}
      </g>
      {mood === "estudando" ? (
        <g transform="translate(0 120)">
          <path d="M0 -6 L-95 -20 L-95 50 L0 62Z" fill="#fff" stroke={M.ink} strokeWidth={7} strokeLinejoin="round" />
          <path d="M0 -6 L95 -20 L95 50 L0 62Z" fill="#fff" stroke={M.ink} strokeWidth={7} strokeLinejoin="round" />
          {[0, 1, 2].map((i) => <line key={i} x1={-80} y1={4 + i * 16} x2={-14} y2={10 + i * 16} stroke={M.dim} strokeWidth={5} strokeLinecap="round" />)}
          {[0, 1, 2].map((i) => <line key={i} x1={14} y1={10 + i * 16} x2={80} y2={4 + i * 16} stroke={M.dim} strokeWidth={5} strokeLinecap="round" />)}
        </g>
      ) : null}
      {mood === "empresario" ? (
        <g transform="translate(100 112)">
          <rect x={-8} y={-16} width={60} height={46} rx={8} fill="#7A4A25" stroke={M.ink} strokeWidth={6} />
          <path d="M8 -16 v-12 h28 v12" fill="none" stroke={M.ink} strokeWidth={6} />
        </g>
      ) : null}
    </svg>
  );
};

/** Cena com a Bolinha e uma legenda grande ao lado. `data.mood`, `data.caption: [linhas]`, `data.accent?: índice da linha laranja`. */
const Mascot: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { t, pop } = useClock(scene);
  const d = scene.data as { mood: "olhando" | "empresario" | "estudando" | "quebrando" | "feliz"; caption?: string[]; accent?: number; at?: number };
  const e = pop(scene.from + 0.05, M.spring.snap);
  const at = d.at ?? scene.from + 0.5;
  const crack = interpolate(t, [at, at + 0.7], [0, 1], { easing: M.out, ...clamp });
  const bounce = Math.abs(Math.sin((t - scene.from) * 3.2)) * 18;
  return (
    <Area style={{ gap: 14 }}>
      <div style={{ transform: `translateY(${-bounce + interpolate(e, [0, 1], [50, 0])}px) scale(${interpolate(e, [0, 1], [0.7, 1])})`, opacity: e }}>
        <Bolinha mood={d.mood} t={t - scene.from} size={d.caption ? 330 : 400} crack={crack} />
      </div>
      {d.caption ? (
        <div style={{ fontFamily: M.font, fontWeight: 900, fontSize: Math.max(...d.caption.map((l) => l.length)) > 8 ? 74 : 92, lineHeight: 0.98, letterSpacing: "-0.03em", color: M.ink }}>
          {d.caption.map((l, i) => {
            const p = pop(scene.from + 0.25 + i * 0.2);
            return <div key={i} style={{ color: d.accent === i ? M.hero : M.ink, opacity: p, transform: `translateX(${interpolate(p, [0, 1], [40, 0])}px)` }}>{l}</div>;
          })}
        </div>
      ) : null}
    </Area>
  );
};

/** Martelo de leilão batendo; carimbo em `at`. */
const Gavel: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { t, pop } = useClock(scene);
  const d = scene.data as { at: number; stamp: string };
  const hit = pop(d.at, { damping: 12, stiffness: 300, mass: 0.5 });
  const raise = interpolate(t, [scene.from + 0.1, d.at - 0.12], [-8, -62], { easing: M.out, ...clamp });
  const ang = t < d.at - 0.12 ? raise : interpolate(hit, [0, 1], [-62, 4]);
  const st = pop(d.at + 0.12, M.spring.stamp);
  const ring = interpolate(t, [d.at, d.at + 0.35], [0, 1], { easing: M.out, ...clamp });
  return (
    <Area>
      <svg width={900} height={460} viewBox="0 0 900 460">
        <ellipse cx={450} cy={400} rx={210} ry={26} fill="#17171A" opacity={0.12} />
        <rect x={270} y={330} width={360} height={70} rx={18} fill="#7A4A25" stroke={M.ink} strokeWidth={8} />
        <circle cx={450} cy={330} r={30 + ring * 120} fill="none" stroke={M.hero} strokeWidth={8} opacity={t >= d.at ? 1 - ring : 0} />
        <g transform={`translate(560 300) rotate(${ang})`}>
          <rect x={-240} y={-9} width={250} height={18} rx={9} fill="#B07A45" stroke={M.ink} strokeWidth={6} />
          <rect x={-310} y={-46} width={110} height={92} rx={18} fill="#7A4A25" stroke={M.ink} strokeWidth={8} />
        </g>
        <g transform={`translate(450 150) rotate(-8) scale(${st})`} opacity={st}>
          <rect x={-250} y={-62} width={500} height={124} rx={22} fill="none" stroke={M.hero} strokeWidth={10} />
          <text textAnchor="middle" dominantBaseline="central" fontFamily={M.font} fontWeight={900} fontSize={84} letterSpacing="0.06em" fill={M.hero}>{d.stamp}</text>
        </g>
      </svg>
    </Area>
  );
};

/** Torcida: grade de bolinhas pulando; em `at` entra um ✕ grande e o texto. */
const Crowd: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { t, pop } = useClock(scene);
  const d = scene.data as { at: number; text: string };
  const x = pop(d.at, M.spring.stamp);
  const cols = 9, rows = 4;
  return (
    <Area>
      <div style={{ position: "relative", width: 900, height: 440 }}>
        {Array.from({ length: cols * rows }, (_, i) => {
          const c = i % cols, r = Math.floor(i / cols);
          const p = pop(scene.from + 0.03 * i, M.spring.snap);
          const jump = Math.abs(Math.sin((t - scene.from) * 5 + i * 0.7)) * 20;
          return (
            <svg key={i} width={84} height={84} viewBox="-50 -50 100 100" style={{ position: "absolute", left: c * 100, top: r * 108 + 10 - jump, opacity: p * (1 - 0.55 * x), transform: `scale(${p})` }}>
              <circle r={44} fill="#fff" stroke={M.ink} strokeWidth={6} />
              <circle cx={-14} cy={-6} r={6} fill={M.ink} /><circle cx={14} cy={-6} r={6} fill={M.ink} />
              <path d="M-14 14 Q0 28 14 14" fill="none" stroke={M.ink} strokeWidth={5} strokeLinecap="round" />
            </svg>
          );
        })}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, opacity: x, transform: `scale(${interpolate(x, [0, 1], [1.6, 1])})` }}>
          <div style={{ fontFamily: M.font, fontWeight: 900, fontSize: 130, lineHeight: 1, letterSpacing: "-0.03em", color: M.hero, background: "#EBEBE6dd", borderRadius: 28, padding: "6px 34px 12px" }}>{d.text}</div>
        </div>
      </div>
    </Area>
  );
};

/** Janela de notícia/aplicativo com título digitando, selo e sublinhado desenhado à mão. */
const News: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { t, pop } = useClock(scene);
  const d = scene.data as { source?: string; title: string; typeAt?: number; sticker?: { text: string; at: number }; markAt?: number; tag?: string };
  const start = d.typeAt ?? scene.from + 0.3;
  const n = Math.max(0, Math.floor((t - start) * 34));
  const shown = d.title.slice(0, n);
  const e = pop(scene.from + 0.05, M.spring.snap);
  const sp = d.sticker ? pop(d.sticker.at, M.spring.stamp) : 0;
  const mark = d.markAt !== undefined ? interpolate(t, [d.markAt, d.markAt + 0.4], [0, 1], { easing: M.out, ...clamp }) : 0;
  return (
    <Area>
      <div style={{ position: "relative", width: 900, background: M.card, borderRadius: 36, boxShadow: M.shadow, overflow: "visible", opacity: e, transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 28px", borderBottom: "2px solid #ECECE7" }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => <div key={c} style={{ width: 18, height: 18, borderRadius: 99, background: c }} />)}
          <div style={{ marginLeft: 18, fontFamily: M.font, fontWeight: 700, fontSize: 22, letterSpacing: "0.18em", color: M.dim }}>{d.source ?? "NOTÍCIA"}</div>
        </div>
        <div style={{ position: "relative", padding: "34px 40px 40px", minHeight: 250 }}>
          {d.tag ? <div style={{ display: "inline-block", fontFamily: M.font, fontWeight: 800, fontSize: 24, letterSpacing: "0.16em", color: "#fff", background: M.hero, borderRadius: 999, padding: "6px 20px", marginBottom: 18 }}>{d.tag}</div> : null}
          <div style={{ fontFamily: M.font, fontWeight: 900, fontSize: 84, lineHeight: 1.02, letterSpacing: "-0.03em", color: M.ink, position: "relative" }}>
            {shown}
            <span style={{ opacity: Math.floor(t * 3) % 2 ? 0 : 1, color: M.hero }}>|</span>
            {d.markAt !== undefined ? (
              <svg width="100%" height={24} viewBox="0 0 400 24" preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: -26 }}>
                <path d="M2 14 Q40 2 80 14 T160 14 T240 14 T320 14 T398 12" fill="none" stroke={M.hero} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - mark} />
              </svg>
            ) : null}
          </div>
        </div>
        {d.sticker ? (
          <div style={{ position: "absolute", right: -26, top: -36, background: M.hero, color: "#fff", fontFamily: M.font, fontWeight: 900, fontSize: 80, padding: "4px 30px 10px", borderRadius: 28, boxShadow: M.shadow, transform: `scale(${sp}) rotate(${interpolate(sp, [0, 1], [-14, 6])}deg)` }}>{d.sticker.text}</div>
        ) : null}
      </div>
    </Area>
  );
};

/** Passos numerados (CTA): cada item entra em `at`. */
const Steps: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { pop } = useClock(scene);
  const items: { text: string; at: number; sub?: string }[] = scene.data?.items ?? [];
  return (
    <Area>
      <div style={{ width: 900, background: M.card, borderRadius: 44, boxShadow: M.shadow, padding: "16px 40px" }}>
        {items.map((it, i) => {
          const p = pop(it.at, M.spring.snap);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 30, height: 150, borderTop: i ? "2px solid #E4E4DF" : "none", opacity: p, transform: `translateX(${interpolate(p, [0, 1], [-50, 0])}px)` }}>
              <div style={{ width: 84, height: 84, borderRadius: 99, background: M.hero, color: "#fff", fontFamily: M.font, fontWeight: 900, fontSize: 52, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
              <div>
                <div style={{ fontFamily: M.font, fontWeight: 900, fontSize: 62, letterSpacing: "-0.02em", color: M.ink, lineHeight: 1 }}>{it.text}</div>
                {it.sub ? <div style={{ fontFamily: M.font, fontWeight: 600, fontSize: 32, color: M.dim, marginTop: 8 }}>{it.sub}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </Area>
  );
};

const table = { bigword: BigWord, duo: Duo, calendar: Calendar, boleto: Boleto, bars: Bars, line: Line, question: Question, pie: Pie, timeline: Timeline, scale: Scale, checklist: Checklist, counter: Counter, versus: Versus, swap: Swap, chat: Chat, pics: Pics, kick: Kick, debate: Debate, mascot: Mascot, gavel: Gavel, crowd: Crowd, news: News, steps: Steps } as const;

export const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  const C = table[scene.kind];
  return (
    <Shell scene={scene}>
      <C scene={scene} />
    </Shell>
  );
};
