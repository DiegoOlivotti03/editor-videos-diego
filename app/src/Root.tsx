import React from "react";
import { Composition } from "remotion";
import { Modelo } from "./modelo/Modelo";
import type { ModeloProps } from "./modelo/types";

const modeloDefaults: ModeloProps = {
  speaker: "falas.mp4", durationSeconds: 20, fps: 30, splitRatio: 0.51, faceY: 10,
  captions: [], highlight: [], scenes: [], zoomCuts: [], zoomLevel: 1.06, sfx: true,
};

export const Root: React.FC = () => (
  <>
  <Composition
    id="Modelo"
    component={Modelo}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={600}
    defaultProps={modeloDefaults}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, Math.round(props.durationSeconds * props.fps)), fps: props.fps })}
  />
  </>
);
