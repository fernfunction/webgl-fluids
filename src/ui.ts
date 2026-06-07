import { PRESETS, hsvToRgb } from "./presets";
import type { Config, Preset, Tool } from "./types";

export interface UICallbacks {
  config: Config;
  getTool(): Tool;
  getPreset(): Preset;
  onPreset(preset: Preset): void;
  onTool(tool: Tool): void;
  onReset(): void;
  onClear(): void;
  onRandom(): void;
  onPauseChange(paused: boolean): void;
}

// monta o painel de controles e liga os elementos aos parâmetros
export class UI {
  private cb: UICallbacks;
  private presetButtons = new Map<string, HTMLButtonElement>();
  private toolButtons = new Map<Tool, HTMLButtonElement>();

  constructor(cb: UICallbacks) {
    this.cb = cb;
    this.build();
    this.setupToggle();
  }

  private el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    cls?: string,
    text?: string
  ): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  private section(label: string): HTMLDivElement {
    const sec = this.el("div", "section");
    sec.appendChild(this.el("span", "label", label));
    return sec;
  }

  private build(): void {
    const panel = document.getElementById("panel")!;
    panel.innerHTML = "";

    const title = this.el("h2", undefined, "Fluid Sandbox");
    const subtitle = this.el(
      "p",
      "subtitle",
      "Simulação de fluidos em GPU · WebGL2"
    );
    panel.appendChild(title);
    panel.appendChild(subtitle);

    // presets
    const presetSec = this.section("Fluido");
    const presetGrid = this.el("div", "grid cols-2");
    for (const preset of PRESETS) {
      const btn = this.el("button", "preset-btn") as HTMLButtonElement;
      const dot = this.el("span", "dot");
      const [r, g, b] = preset.color;
      const cssColor = `rgb(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0})`;
      dot.style.color = cssColor;
      dot.style.background = cssColor;
      btn.appendChild(dot);
      btn.appendChild(document.createTextNode(preset.name));
      btn.addEventListener("click", () => {
        this.cb.onPreset(preset);
        this.refreshPresetButtons();
      });
      this.presetButtons.set(preset.id, btn);
      presetGrid.appendChild(btn);
    }
    presetSec.appendChild(presetGrid);
    panel.appendChild(presetSec);

    // ferramentas
    const toolSec = this.section("Ferramenta");
    const toolGrid = this.el("div", "grid cols-2");
    const tools: { tool: Tool; label: string }[] = [
      { tool: "fluid", label: "💧 Fluido" },
      { tool: "wall", label: "🧱 Parede" },
      { tool: "eraser", label: "🧽 Borracha" },
    ];
    for (const { tool, label } of tools) {
      const btn = this.el("button", "tool-btn", label) as HTMLButtonElement;
      btn.addEventListener("click", () => {
        this.cb.onTool(tool);
        this.refreshToolButtons();
      });
      this.toolButtons.set(tool, btn);
      toolGrid.appendChild(btn);
    }
    toolSec.appendChild(toolGrid);
    panel.appendChild(toolSec);

    // sliders
    const cfg = this.cb.config;
    const slidersSec = this.section("Ajustes");
    slidersSec.appendChild(
      this.slider("Raio do pincel", cfg.splatRadius, 0.05, 1, 0.01, (v) => {
        cfg.splatRadius = v;
      })
    );
    slidersSec.appendChild(
      this.slider("Força do pincel", cfg.splatForce, 1000, 15000, 100, (v) => {
        cfg.splatForce = v;
      })
    );
    slidersSec.appendChild(
      this.slider("Vorticidade", cfg.curl, 0, 60, 1, (v) => {
        cfg.curl = v;
      })
    );
    slidersSec.appendChild(
      this.slider("Viscosidade", cfg.viscosity, 0, 0.4, 0.01, (v) => {
        cfg.viscosity = v;
      })
    );
    slidersSec.appendChild(
      this.slider("Dissip. corante", cfg.densityDissipation, 0, 4, 0.05, (v) => {
        cfg.densityDissipation = v;
      })
    );
    slidersSec.appendChild(
      this.slider(
        "Dissip. velocidade",
        cfg.velocityDissipation,
        0,
        4,
        0.05,
        (v) => {
          cfg.velocityDissipation = v;
        }
      )
    );
    slidersSec.appendChild(
      this.slider("Bloom", cfg.bloom, 0, 1.2, 0.01, (v) => {
        cfg.bloom = v;
      })
    );
    panel.appendChild(slidersSec);

    // toggles
    const toggleSec = this.section("Opções");
    toggleSec.appendChild(
      this.toggle("Gravidade", cfg.gravityEnabled, (on) => {
        cfg.gravityEnabled = on;
      })
    );
    toggleSec.appendChild(
      this.toggle("Pausar", cfg.paused, (on) => {
        cfg.paused = on;
        this.cb.onPauseChange(on);
      })
    );
    panel.appendChild(toggleSec);

    // ações
    const actionSec = this.section("Ações");
    const actionGrid = this.el("div", "grid cols-2");
    const randomBtn = this.el(
      "button",
      "action-btn",
      "🎲 Splat"
    ) as HTMLButtonElement;
    randomBtn.addEventListener("click", () => this.cb.onRandom());
    const clearBtn = this.el(
      "button",
      "action-btn",
      "✨ Limpar"
    ) as HTMLButtonElement;
    clearBtn.addEventListener("click", () => this.cb.onClear());
    const resetBtn = this.el(
      "button",
      "action-btn",
      "♻️ Reset"
    ) as HTMLButtonElement;
    resetBtn.addEventListener("click", () => this.cb.onReset());
    actionGrid.appendChild(randomBtn);
    actionGrid.appendChild(clearBtn);
    actionGrid.appendChild(resetBtn);
    actionSec.appendChild(actionGrid);
    panel.appendChild(actionSec);

    // dica
    const hint = this.el(
      "p",
      "hint",
      "Arraste no canvas para injetar líquido. A gravidade o faz cair e empoçar; o espaço vazio é ar e não o dissolve. As bordas já são paredes: use a Borracha para abrir passagens nelas ou desenhe novos obstáculos com Parede. ☰ recolhe o painel."
    );
    panel.appendChild(hint);

    this.refreshPresetButtons();
    this.refreshToolButtons();
  }

  private slider(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void
  ): HTMLDivElement {
    const wrap = this.el("div", "slider");
    const row = this.el("div", "row");
    const name = this.el("span", undefined, label);
    const val = this.el("span", "val", this.fmt(value, step));
    row.appendChild(name);
    row.appendChild(val);
    const input = this.el("input") as HTMLInputElement;
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.addEventListener("input", () => {
      const v = parseFloat(input.value);
      val.textContent = this.fmt(v, step);
      onChange(v);
    });
    wrap.appendChild(row);
    wrap.appendChild(input);
    return wrap;
  }

  private fmt(v: number, step: number): string {
    if (step >= 1) return String(Math.round(v));
    if (step >= 0.1) return v.toFixed(1);
    return v.toFixed(2);
  }

  private toggle(
    label: string,
    initial: boolean,
    onChange: (on: boolean) => void
  ): HTMLDivElement {
    const wrap = this.el("div", "toggle" + (initial ? " on" : ""));
    wrap.appendChild(this.el("span", undefined, label));
    wrap.appendChild(this.el("span", "switch"));
    wrap.addEventListener("click", () => {
      const on = !wrap.classList.contains("on");
      wrap.classList.toggle("on", on);
      onChange(on);
    });
    return wrap;
  }

  private refreshPresetButtons(): void {
    const current = this.cb.getPreset().id;
    for (const [id, btn] of this.presetButtons)
      btn.classList.toggle("active", id === current);
  }

  private refreshToolButtons(): void {
    const current = this.cb.getTool();
    for (const [tool, btn] of this.toolButtons)
      btn.classList.toggle("active", tool === current);
  }

  // refaz os sliders com os valores do preset que acabou de entrar
  rebuild(): void {
    this.build();
  }

  private setupToggle(): void {
    const btn = document.getElementById("toggle-panel")!;
    const panel = document.getElementById("panel")!;
    btn.addEventListener("click", () =>
      document.body.classList.remove("panel-hidden")
    );
    // o ✕ no canto do painel pra recolher
    const collapse = this.el("button", undefined, "✕") as HTMLButtonElement;
    collapse.setAttribute("aria-label", "Recolher painel");
    collapse.style.cssText =
      "position:absolute;top:12px;right:12px;background:none;border:none;color:var(--text-dim);font-size:14px;cursor:pointer;";
    collapse.addEventListener("click", () =>
      document.body.classList.add("panel-hidden")
    );
    panel.style.position = "fixed";
    panel.appendChild(collapse);
  }

  // gera a cor do splat a partir do preset (matiz aleatória se for multiColor)
  static colorFromPreset(preset: Preset): [number, number, number] {
    let c: [number, number, number];
    if (preset.multiColor) {
      c = hsvToRgb(Math.random() * 360, 0.85, 1.0);
    } else {
      c = [preset.color[0], preset.color[1], preset.color[2]];
    }
    const scale = 0.18;
    return [c[0] * scale, c[1] * scale, c[2] * scale];
  }
}
