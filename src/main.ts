import "./style.css";
import { applyPreset, defaultConfig } from "./config";
import { createGLContext, GLInitError } from "./gl-utils";
import { t } from "./i18n";
import { InputManager } from "./input";
import { getPreset } from "./presets";
import { FluidSimulation } from "./simulation";
import type { Preset, Tool } from "./types";
import { UI } from "./ui";

function showUnsupported(message: string): void {
  const el = document.getElementById("unsupported")!;
  const title = document.querySelector<HTMLHeadingElement>("#unsupported h1")!;
  const msg = document.getElementById("unsupported-msg")!;
  title.textContent = t("unsupported.title");
  msg.textContent = message;
  el.hidden = false;
}

function scaleByPixelRatio(input: number): number {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  return Math.floor(input * ratio);
}

function boot(): void {
  try {
    bootInner();
  } catch (err) {
    console.error("Erro fatal na inicialização:", err);
    showUnsupported(
      t("error.initFailed", { msg: (err as Error)?.message ?? String(err) })
    );
  }
}

function bootInner(): void {
  const canvas = document.getElementById("sim") as HTMLCanvasElement;

  let glx;
  try {
    glx = createGLContext(canvas);
  } catch (err) {
    if (err instanceof GLInitError) showUnsupported(err.message);
    else
      showUnsupported(t("error.unexpected", { msg: (err as Error).message }));
    return;
  }

  const config = defaultConfig();
  let currentPreset: Preset = getPreset("water");
  let currentTool: Tool = "fluid";
  applyPreset(config, currentPreset);

  const sim = new FluidSimulation(glx, config);

  const input = new InputManager(canvas, () =>
    rawColorForStroke(currentPreset)
  );

  const ui = new UI({
    config,
    getTool: () => currentTool,
    getPreset: () => currentPreset,
    onPreset: (preset) => {
      currentPreset = preset;
      applyPreset(config, preset);
      ui.rebuild();
    },
    onTool: (tool) => {
      currentTool = tool;
    },
    onReset: () => sim.reset(),
    onClear: () => sim.clearFluid(),
    onRandom: () => randomSplats(),
    onPauseChange: () => {},
  });

  // cor de um traço: a matiz do preset (aleatória se for multiColor), sem escala
  function rawColorForStroke(preset: Preset): [number, number, number] {
    return UI.colorFromPreset(preset);
  }

  function randomSplats(): void {
    const n = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < n; i++) {
      const color = UI.colorFromPreset(currentPreset).map(
        (c) => c * 6
      ) as [number, number, number];
      const x = Math.random();
      const y = Math.random();
      const dx = (Math.random() - 0.5) * 1000;
      const dy = (Math.random() - 0.5) * 1000;
      sim.splatPointer(x, y, dx, dy, color);
    }
  }

  function resizeCanvas(): boolean {
    const w = scaleByPixelRatio(canvas.clientWidth);
    const h = scaleByPixelRatio(canvas.clientHeight);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      return true;
    }
    return false;
  }

  resizeCanvas();
  sim.resize();
  // bordas viram parede por padrão: a área é uma caixa que segura o líquido
  sim.seedBorders();
  window.addEventListener("resize", () => {
    if (resizeCanvas()) sim.resize();
  });

  // uns splats iniciais pra tela não nascer vazia
  randomSplats();

  // loop principal
  const fpsEl = document.getElementById("fps")!;
  // span dinâmico (fps/preset) + crédito estático com link pro autor
  const fpsStat = document.createElement("span");
  const credit = document.createElement("span");
  credit.className = "credit";
  credit.append(" · Davi Viana @");
  const creditLink = document.createElement("a");
  creditLink.href = "https://github.com/fernfunction";
  creditLink.target = "_blank";
  creditLink.rel = "noopener noreferrer";
  creditLink.textContent = "fernfunction";
  credit.append(creditLink);
  fpsEl.append(fpsStat, credit);
  let lastTime = performance.now();
  let fpsAccum = 0;
  let fpsFrames = 0;
  let fpsTimer = 0;
  let lowFpsTime = 0;
  let downgraded = false;

  function processInput(): void {
    const presetForce = currentPreset.splatForce;
    for (const p of input.pointers) {
      if (!p.down || !p.moved) continue;
      if (currentTool === "fluid") {
        const dx = p.deltaX * config.splatForce * presetForce;
        const dy = p.deltaY * config.splatForce * presetForce;
        sim.splatPointer(p.texcoordX, p.texcoordY, dx, dy, p.color);
      } else if (currentTool === "wall") {
        sim.paintWall(p.texcoordX, p.texcoordY, true);
      } else if (currentTool === "eraser") {
        sim.paintWall(p.texcoordX, p.texcoordY, false);
        sim.eraseDyeAt(p.texcoordX, p.texcoordY);
      }
      p.moved = false;
    }
  }

  function maybeAdaptResolution(fps: number, dt: number): void {
    if (downgraded) return;
    if (fps < 28) lowFpsTime += dt;
    else lowFpsTime = 0;
    if (lowFpsTime > 2.5 && config.simResolution > 128) {
      config.simResolution = 128;
      config.dyeResolution = Math.min(config.dyeResolution, 768);
      sim.resize();
      downgraded = true;
    }
  }

  function frame(now: number): void {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    dt = Math.min(dt, 1 / 60); // clamp pra não dar salto

    processInput();

    if (!config.paused) sim.step(dt);
    sim.render();

    // fps
    fpsAccum += dt;
    fpsFrames++;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
      const fps = fpsFrames / fpsAccum;
      fpsStat.textContent = t("fps", {
        fps: Math.round(fps),
        preset: t("preset." + currentPreset.id),
      });
      maybeAdaptResolution(fps, fpsTimer);
      fpsAccum = 0;
      fpsFrames = 0;
      fpsTimer = 0;
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

boot();
