import { archivoFamily } from "./fonts";
import { Easing } from "remotion";


export const M = {
  bg: "#EBEBE6",
  ink: "#17171A",
  dim: "#9A9A94",
  card: "#FFFFFF",
  dark: "#1B1B1E",
  hero: "#E8452C",
  font: `${archivoFamily}, Inter, system-ui, sans-serif`,
  // ritmo suave: entradas com saída longa, saídas rápidas
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  spring: {
    soft: { damping: 22, stiffness: 120, mass: 0.9 },
    snap: { damping: 16, stiffness: 190, mass: 0.6 },
    stamp: { damping: 11, stiffness: 240, mass: 0.6 },
  },
  shadow: "0 18px 50px rgba(20,20,20,0.10), 0 2px 6px rgba(20,20,20,0.06)",
} as const;
