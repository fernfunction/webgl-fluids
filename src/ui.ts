import { PRESETS, hsvToRgb } from "./presets";
import { LANGS, getLang, onLangChange, setLang, t } from "./i18n";
import type { Config, Preset, Tool } from "./types";
import IconWater from "~icons/mdi/water";
import IconWall from "~icons/mdi/wall";
import IconEraser from "~icons/mdi/eraser";
import FlagUS from "~icons/circle-flags/us";
import FlagBR from "~icons/circle-flags/br";
import FlagES from "~icons/circle-flags/es";
import type { Lang } from "./i18n";

// bandeira (SVG do unplugin) por idioma
const FLAGS: Record<Lang, string> = {
  "en-US": FlagUS,
  "pt-BR": FlagBR,
  es: FlagES,
};
import IconDice from "~icons/mdi/dice-multiple";
import IconClear from "~icons/mdi/auto-fix";
import IconReset from "~icons/mdi/refresh";
import IconClose from "~icons/mdi/close";
import IconMenu from "~icons/mdi/menu";

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
    // trocar de idioma redesenha o painel inteiro com os novos textos
    onLangChange(() => this.rebuild());
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

  // botão com um ícone SVG (string do unplugin) seguido do rótulo
  private iconButton(cls: string, icon: string, label: string): HTMLButtonElement {
    const btn = this.el("button", cls) as HTMLButtonElement;
    const ic = this.el("span", "icon");
    ic.innerHTML = icon;
    btn.appendChild(ic);
    btn.appendChild(document.createTextNode(label));
    return btn;
  }

  private section(label: string): HTMLDivElement {
    const sec = this.el("div", "section");
    sec.appendChild(this.el("span", "label", label));
    return sec;
  }

  private build(): void {
    const panel = document.getElementById("panel")!;
    panel.innerHTML = "";

    const title = this.el("h2", undefined, t("title"));
    const subtitle = this.el("p", "subtitle", t("subtitle"));
    panel.appendChild(title);
    panel.appendChild(subtitle);

    // presets
    const presetSec = this.section(t("section.fluid"));
    const presetGrid = this.el("div", "grid cols-2");
    this.presetButtons.clear();
    for (const preset of PRESETS) {
      const btn = this.el("button", "preset-btn") as HTMLButtonElement;
      const dot = this.el("span", "dot");
      const [r, g, b] = preset.color;
      const cssColor = `rgb(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0})`;
      dot.style.color = cssColor;
      dot.style.background = cssColor;
      btn.appendChild(dot);
      btn.appendChild(document.createTextNode(t("preset." + preset.id)));
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
    const toolSec = this.section(t("section.tool"));
    const toolGrid = this.el("div", "grid cols-2");
    this.toolButtons.clear();
    const tools: { tool: Tool; icon: string }[] = [
      { tool: "fluid", icon: IconWater },
      { tool: "wall", icon: IconWall },
      { tool: "eraser", icon: IconEraser },
    ];
    for (const { tool, icon } of tools) {
      const btn = this.iconButton("tool-btn", icon, t("tool." + tool));
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
    const slidersSec = this.section(t("section.settings"));
    slidersSec.appendChild(
      this.slider(t("slider.splatRadius"), cfg.splatRadius, 0.05, 1, 0.01, (v) => {
        cfg.splatRadius = v;
      })
    );
    slidersSec.appendChild(
      this.slider(t("slider.splatForce"), cfg.splatForce, 1000, 15000, 100, (v) => {
        cfg.splatForce = v;
      })
    );
    slidersSec.appendChild(
      this.slider(t("slider.curl"), cfg.curl, 0, 60, 1, (v) => {
        cfg.curl = v;
      })
    );
    slidersSec.appendChild(
      this.slider(t("slider.viscosity"), cfg.viscosity, 0, 0.4, 0.01, (v) => {
        cfg.viscosity = v;
      })
    );
    slidersSec.appendChild(
      this.slider(
        t("slider.densityDissipation"),
        cfg.densityDissipation,
        0,
        4,
        0.05,
        (v) => {
          cfg.densityDissipation = v;
        }
      )
    );
    slidersSec.appendChild(
      this.slider(
        t("slider.velocityDissipation"),
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
      this.slider(t("slider.bloom"), cfg.bloom, 0, 1.2, 0.01, (v) => {
        cfg.bloom = v;
      })
    );
    panel.appendChild(slidersSec);

    // toggles
    const toggleSec = this.section(t("section.options"));
    toggleSec.appendChild(
      this.toggle(t("toggle.gravity"), cfg.gravityEnabled, (on) => {
        cfg.gravityEnabled = on;
      })
    );
    toggleSec.appendChild(
      this.toggle(t("toggle.pause"), cfg.paused, (on) => {
        cfg.paused = on;
        this.cb.onPauseChange(on);
      })
    );
    panel.appendChild(toggleSec);

    // ações
    const actionSec = this.section(t("section.actions"));
    const actionGrid = this.el("div", "grid cols-2");
    const randomBtn = this.iconButton("action-btn", IconDice, t("action.splat"));
    randomBtn.addEventListener("click", () => this.cb.onRandom());
    const clearBtn = this.iconButton("action-btn", IconClear, t("action.clear"));
    clearBtn.addEventListener("click", () => this.cb.onClear());
    const resetBtn = this.iconButton("action-btn", IconReset, t("action.reset"));
    resetBtn.addEventListener("click", () => this.cb.onReset());
    actionGrid.appendChild(randomBtn);
    actionGrid.appendChild(clearBtn);
    actionGrid.appendChild(resetBtn);
    actionSec.appendChild(actionGrid);
    panel.appendChild(actionSec);

    // idioma
    const langSec = this.section(t("section.language"));
    const langGrid = this.el("div", "grid cols-3");
    for (const { code, label } of LANGS) {
      const btn = this.iconButton("tool-btn", FLAGS[code], label);
      btn.classList.toggle("active", code === getLang());
      btn.addEventListener("click", () => setLang(code));
      langGrid.appendChild(btn);
    }
    langSec.appendChild(langGrid);
    panel.appendChild(langSec);

    // dica
    const hint = this.el("p", "hint");
    hint.innerHTML = t("hint", {
      menu: `<span class="icon icon-inline">${IconMenu}</span>`,
    });
    panel.appendChild(hint);

    // botão X que recolhe o painel; recriado aqui porque o build limpa o painel
    const collapse = this.el("button", "collapse-btn") as HTMLButtonElement;
    collapse.innerHTML = `<span class="icon">${IconClose}</span>`;
    collapse.setAttribute("aria-label", t("aria.collapsePanel"));
    collapse.addEventListener("click", () =>
      document.body.classList.add("panel-hidden")
    );
    panel.appendChild(collapse);

    // o botão flutuante fica fora do painel, então só atualizo o rótulo aqui
    document
      .getElementById("toggle-panel")
      ?.setAttribute("aria-label", t("aria.togglePanel"));

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

  // redesenha o painel (troca de preset ou de idioma)
  rebuild(): void {
    this.build();
  }

  private setupToggle(): void {
    const btn = document.getElementById("toggle-panel")!;
    btn.innerHTML = `<span class="icon">${IconMenu}</span>`;
    btn.addEventListener("click", () =>
      document.body.classList.remove("panel-hidden")
    );
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
