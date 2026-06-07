import type { Config, Preset } from "./types";

// config inicial; os presets sobrescrevem boa parte disso
export function defaultConfig(): Config {
  return {
    simResolution: 192,
    dyeResolution: 1024,
    bloomResolution: 256,
    pressureIterations: 25,
    viscosityIterations: 2,
    splatRadius: 0.22,
    splatForce: 6000,
    velocityDissipation: 0.2,
    densityDissipation: 0.05,
    pressure: 0.8,
    curl: 30,
    viscosity: 0,
    emissive: 0,
    specular: 0.35,
    shininess: 48,
    bloom: 0.05,
    bloomThreshold: 0.55,
    gravityEnabled: true,
    gravity: [0, -18],
    borderThickness: 4,
    paused: false,
  };
}

// joga os parâmetros do preset na config, sem mexer nos ajustes globais
export function applyPreset(config: Config, preset: Preset): void {
  config.velocityDissipation = preset.velocityDissipation;
  config.densityDissipation = preset.densityDissipation;
  config.pressure = preset.pressure;
  config.curl = preset.curl;
  config.viscosity = preset.viscosity;
  config.emissive = preset.emissive;
  config.specular = preset.specular;
  config.shininess = preset.shininess;
  config.bloom = preset.bloom;
  config.gravity = [preset.gravity[0], preset.gravity[1]];
}
