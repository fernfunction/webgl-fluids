export type Tool = "fluid" | "wall" | "eraser";

export interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach(unit: number): number;
}

// par de FBOs pro ping-pong: lê de read, escreve em write, troca
export interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap(): void;
}

export interface TexFormat {
  internalFormat: number;
  format: number;
}

// um preset de fluido (ver §6 do plano)
export interface Preset {
  id: string;
  name: string;
  // cor base (albedo) em RGB 0..1
  color: [number, number, number];
  // se true, cada splat ganha uma matiz aleatória (tinta)
  multiColor: boolean;
  // dissipação da velocidade (maior = movimento some mais rápido)
  velocityDissipation: number;
  // dissipação do corante (maior = cor some mais rápido)
  densityDissipation: number;
  // quanto a pressão decai por frame (0..1)
  pressure: number;
  // força do vorticity confinement
  curl: number;
  // viscosidade aproximada: 0 é nenhuma, ~0.3 já é bem espessa
  viscosity: number;
  // emissão: 0 é opaco iluminado, 1 é emissivo puro (lava/plasma)
  emissive: number;
  specular: number;
  shininess: number;
  bloom: number;
  // empuxo/gravidade padrão no espaço da sim (+y aponta pra cima)
  gravity: [number, number];
  // multiplicador de força do splat (fluido espesso empurra menos)
  splatForce: number;
}

// parâmetros que mudam em runtime: presets preenchem, sliders ajustam
export interface Config {
  simResolution: number;
  dyeResolution: number;
  bloomResolution: number;
  pressureIterations: number;
  viscosityIterations: number;
  splatRadius: number;
  splatForce: number;
  velocityDissipation: number;
  densityDissipation: number;
  pressure: number;
  curl: number;
  viscosity: number;
  emissive: number;
  specular: number;
  shininess: number;
  bloom: number;
  bloomThreshold: number;
  gravityEnabled: boolean;
  gravity: [number, number];
  // espessura das paredes de borda, em texels da grade de sim
  borderThickness: number;
  paused: boolean;
}

export interface Pointer {
  id: number;
  down: boolean;
  moved: boolean;
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  color: [number, number, number];
}
