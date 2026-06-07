import type { Preset } from "./types";

// HSV (h em graus 0..360, s/v 0..1) pra RGB 0..1
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [r + m, g + m, b + m];
}

// cada preset junta os dois eixos do plano (viscosidade e albedo) com os
// parâmetros de render que dão a leitura de material
export const PRESETS: Preset[] = [
  {
    id: "water",
    color: hsvToRgb(190, 0.7, 1.0),
    multiColor: false,
    velocityDissipation: 1.5,
    densityDissipation: 0.0,
    pressure: 0.8,
    curl: 10,
    viscosity: 0.06,
    emissive: 0.0,
    specular: 0.35,
    shininess: 48,
    bloom: 0.05,
    gravity: [0, -18],
    splatForce: 1.0,
  },
  {
    id: "oil",
    color: hsvToRgb(35, 0.85, 0.95),
    multiColor: false,
    velocityDissipation: 1.3,
    densityDissipation: 0.0,
    pressure: 0.85,
    curl: 8,
    viscosity: 0.12,
    emissive: 0.0,
    specular: 0.7,
    shininess: 80,
    bloom: 0.06,
    gravity: [0, -14],
    splatForce: 0.7,
  },
  {
    id: "honey",
    color: hsvToRgb(45, 0.95, 1.0),
    multiColor: false,
    velocityDissipation: 1.6,
    densityDissipation: 0.0,
    pressure: 0.9,
    curl: 4,
    viscosity: 0.28,
    emissive: 0.0,
    specular: 0.55,
    shininess: 60,
    bloom: 0.06,
    gravity: [0, -10],
    splatForce: 0.5,
  },
  {
    id: "ink",
    color: hsvToRgb(280, 0.9, 1.0),
    multiColor: true,
    velocityDissipation: 1.1,
    densityDissipation: 0.02,
    pressure: 0.8,
    curl: 14,
    viscosity: 0.04,
    emissive: 0.0,
    specular: 0.1,
    shininess: 20,
    bloom: 0.04,
    gravity: [0, -12],
    splatForce: 0.9,
  },
  {
    id: "smoke",
    color: hsvToRgb(0, 0.0, 0.85),
    multiColor: false,
    velocityDissipation: 0.1,
    densityDissipation: 1.0,
    pressure: 0.7,
    curl: 45,
    viscosity: 0.0,
    emissive: 0.15,
    specular: 0.0,
    shininess: 16,
    bloom: 0.12,
    gravity: [0, 12],
    splatForce: 1.1,
  },
  {
    id: "mercury",
    color: hsvToRgb(210, 0.05, 0.88),
    multiColor: false,
    velocityDissipation: 1.3,
    densityDissipation: 0.0,
    pressure: 0.9,
    curl: 5,
    viscosity: 0.14,
    emissive: 0.0,
    specular: 0.95,
    shininess: 140,
    bloom: 0.08,
    gravity: [0, -20],
    splatForce: 0.6,
  },
  {
    id: "lava",
    color: hsvToRgb(15, 0.95, 1.0),
    multiColor: false,
    velocityDissipation: 1.1,
    densityDissipation: 0.01,
    pressure: 0.9,
    curl: 8,
    viscosity: 0.26,
    emissive: 1.0,
    specular: 0.2,
    shininess: 32,
    bloom: 0.85,
    gravity: [0, -9],
    splatForce: 0.5,
  },
  {
    id: "plasma",
    color: hsvToRgb(300, 0.9, 1.0),
    multiColor: false,
    velocityDissipation: 0.1,
    densityDissipation: 1.2,
    pressure: 0.8,
    curl: 45,
    viscosity: 0.0,
    emissive: 1.0,
    specular: 0.15,
    shininess: 24,
    bloom: 0.75,
    gravity: [0, 0],
    splatForce: 1.1,
  },
];

export function getPreset(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}
