import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions } from "./Captions";
import { SceneView } from "./Scenes";
import { M } from "./style";
import type { LayoutMode, ModeloProps } from "./types";

/** Tela dividida fixa: painel animado em cima (~51%), pessoa embaixo, emenda com degradê. */
export const Modelo: React.FC<ModeloProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const splitFull = Math.round(height * props.splitRatio);

  // Layout animado: a divisória desliza entre os modos (sem quicar, para a altura nunca ficar negativa).
  const stateOf = (mode: LayoutMode) =>
    mode === "speaker"
      ? { splitY: 0, cap: Math.round(height * 0.68) }
      : mode === "panel"
        ? { splitY: height, cap: Math.round(height * 0.7) }
        : { splitY: splitFull, cap: splitFull - 6 };
  const changes = [...(props.layout ?? [])].sort((a, b) => a.from - b.from);
  let cur = stateOf(changes[0]?.mode ?? "split");
  for (let i = 1; i < changes.length; i++) {
    const f = Math.round(changes[i].from * fps);
    if (f > frame) break;
    const to = stateOf(changes[i].mode);
    const p = spring({ frame: frame - f, fps, config: { damping: 28, stiffness: 120, mass: 1 } });
    const prev = stateOf(changes[i - 1].mode);
    cur = { splitY: interpolate(p, [0, 1], [prev.splitY, to.splitY]), cap: interpolate(p, [0, 1], [prev.cap, to.cap]) };
  }
  const splitY = Math.round(Math.min(height, Math.max(0, cur.splitY)));
  const speakerH = height - splitY;
  // Painel: ancorado embaixo ao recolher (sobe e some), centrado e maior ao ocupar a tela toda.
  const panelTop = splitY <= splitFull ? splitY - splitFull : (splitY - splitFull) / 2;
  const panelGrow = Math.max(0, (splitY - splitFull) / (height - splitFull));

  // Zoom alternado nos cortes de silêncio: esconde o corte seco e dá ritmo.
  let zoom = 1;
  const cuts = [...props.zoomCuts].sort((a, b) => a - b);
  for (let i = 0; i < cuts.length; i++) {
    const f = Math.round(cuts[i] * fps);
    if (f > frame) break;
    const target = i % 2 === 0 ? props.zoomLevel : 1;
    const prev = i % 2 === 0 ? 1 : props.zoomLevel;
    zoom = interpolate(spring({ frame: frame - f, fps, config: { damping: 22, stiffness: 150, mass: 0.8 } }), [0, 1], [prev, target]);
  }
  // Respiro: aproximação muito lenta ao longo do vídeo, para a imagem nunca ficar parada.
  const drift = 1 + 0.025 * (frame / (props.durationSeconds * fps));

  return (
    <AbsoluteFill style={{ background: M.bg }}>
      <div style={{ position: "absolute", left: 0, top: splitY, width, height: speakerH, overflow: "hidden", background: "#000" }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom * drift})`, transformOrigin: "50% 40%" }}>
          <OffthreadVideo src={staticFile(props.speaker)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `50% ${props.faceY}%` }} />
        </div>
        {/* degradê da emenda */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 70, background: `linear-gradient(${M.bg}, ${M.bg}00)` }} />
      </div>

      <div style={{ position: "absolute", left: 0, top: 0, width, height: splitY, overflow: "hidden" }}>
       <div style={{ position: "absolute", left: 0, top: panelTop, width, height: splitFull, transform: `scale(${1 + 0.12 * panelGrow})`, transformOrigin: "50% 50%" }}>
        {props.scenes.map((s, i) => (
          <Sequence key={i} from={Math.round(s.from * fps)} durationInFrames={Math.round((s.to - s.from) * fps) + 10}>
            <SceneView scene={s} />
          </Sequence>
        ))}
       </div>
      </div>

      <Captions words={props.captions} highlight={props.highlight} top={cur.cap} />

      {props.sfx
        ? props.scenes.slice(1).map((s, i) => (
            <Sequence key={`s${i}`} from={Math.max(0, Math.round(s.from * fps) - 2)} durationInFrames={40}>
              <Audio src={staticFile("sfx/whoosh.wav")} volume={0.14} />
            </Sequence>
          ))
        : null}
    </AbsoluteFill>
  );
};
