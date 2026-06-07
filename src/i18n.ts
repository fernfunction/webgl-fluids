// i18n simples e sem dependência: dicionários por idioma, t() com interpolação
// de {placeholders} e um observer pra UI se redesenhar quando o idioma muda

export type Lang = "en-US" | "pt-BR" | "es";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en-US", label: "EN" },
  { code: "pt-BR", label: "PT" },
  { code: "es", label: "ES" },
];

type Dict = Record<string, string>;

const messages: Record<Lang, Dict> = {
  "en-US": {
    title: "Fluid Sandbox",
    subtitle: "GPU fluid simulation · WebGL2",
    "section.fluid": "Fluid",
    "section.tool": "Tool",
    "section.settings": "Settings",
    "section.options": "Options",
    "section.actions": "Actions",
    "section.language": "Language",
    "tool.fluid": "Fluid",
    "tool.wall": "Wall",
    "tool.eraser": "Eraser",
    "slider.splatRadius": "Brush radius",
    "slider.splatForce": "Brush force",
    "slider.curl": "Vorticity",
    "slider.viscosity": "Viscosity",
    "slider.densityDissipation": "Dye fade",
    "slider.velocityDissipation": "Velocity fade",
    "slider.bloom": "Bloom",
    "toggle.gravity": "Gravity",
    "toggle.pause": "Pause",
    "action.splat": "Splat",
    "action.clear": "Clear",
    "action.reset": "Reset",
    hint: "Drag on the canvas to inject liquid. Gravity makes it fall and pool; empty space is air and doesn't dissolve it. The edges are walls already: use the Eraser to open gaps in them, or draw new obstacles with Wall. {menu} hides the panel.",
    "aria.togglePanel": "Show/hide controls",
    "aria.collapsePanel": "Collapse panel",
    "unsupported.title": "Oops, incompatible GPU",
    "preset.water": "Water",
    "preset.oil": "Oil",
    "preset.honey": "Honey",
    "preset.ink": "Ink",
    "preset.smoke": "Smoke",
    "preset.mercury": "Mercury",
    "preset.lava": "Lava",
    "preset.plasma": "Plasma",
    "error.webgl2":
      "Your browser doesn't support WebGL2, which the simulation needs. Try an up-to-date browser (recent Chrome, Edge, Firefox or Safari).",
    "error.colorBufferFloat":
      "Your GPU can't render to floating-point textures (EXT_color_buffer_float). The simulation needs this to run with quality.",
    "error.framebuffer":
      "Your GPU couldn't create a floating-point framebuffer (RGBA16F). The simulation can't run on this device/browser.",
    "error.initFailed": "Error starting the simulation: {msg}",
    "error.unexpected": "Unexpected failure starting WebGL: {msg}",
    fps: "{fps} FPS · {preset}",
  },
  "pt-BR": {
    title: "Fluid Sandbox",
    subtitle: "Simulação de fluidos em GPU · WebGL2",
    "section.fluid": "Fluido",
    "section.tool": "Ferramenta",
    "section.settings": "Ajustes",
    "section.options": "Opções",
    "section.actions": "Ações",
    "section.language": "Idioma",
    "tool.fluid": "Fluido",
    "tool.wall": "Parede",
    "tool.eraser": "Borracha",
    "slider.splatRadius": "Raio do pincel",
    "slider.splatForce": "Força do pincel",
    "slider.curl": "Vorticidade",
    "slider.viscosity": "Viscosidade",
    "slider.densityDissipation": "Dissip. corante",
    "slider.velocityDissipation": "Dissip. velocidade",
    "slider.bloom": "Bloom",
    "toggle.gravity": "Gravidade",
    "toggle.pause": "Pausar",
    "action.splat": "Splat",
    "action.clear": "Limpar",
    "action.reset": "Reset",
    hint: "Arraste no canvas para injetar líquido. A gravidade o faz cair e empoçar; o espaço vazio é ar e não o dissolve. As bordas já são paredes: use a Borracha para abrir passagens nelas ou desenhe novos obstáculos com Parede. {menu} recolhe o painel.",
    "aria.togglePanel": "Mostrar/ocultar controles",
    "aria.collapsePanel": "Recolher painel",
    "unsupported.title": "Ops, GPU incompatível",
    "preset.water": "Água",
    "preset.oil": "Óleo",
    "preset.honey": "Mel",
    "preset.ink": "Tinta",
    "preset.smoke": "Fumaça",
    "preset.mercury": "Mercúrio",
    "preset.lava": "Lava",
    "preset.plasma": "Plasma",
    "error.webgl2":
      "Seu navegador não suporta WebGL2, necessário para a simulação. Tente um navegador atualizado (Chrome, Edge, Firefox ou Safari recentes).",
    "error.colorBufferFloat":
      "Sua GPU não permite renderizar em texturas de ponto flutuante (EXT_color_buffer_float). A simulação precisa desse recurso para funcionar com qualidade.",
    "error.framebuffer":
      "Sua GPU não conseguiu criar um framebuffer de ponto flutuante (RGBA16F). A simulação não pode rodar neste dispositivo/navegador.",
    "error.initFailed": "Erro ao iniciar a simulação: {msg}",
    "error.unexpected": "Falha inesperada ao iniciar o WebGL: {msg}",
    fps: "{fps} FPS · {preset}",
  },
  es: {
    title: "Fluid Sandbox",
    subtitle: "Simulación de fluidos en GPU · WebGL2",
    "section.fluid": "Fluido",
    "section.tool": "Herramienta",
    "section.settings": "Ajustes",
    "section.options": "Opciones",
    "section.actions": "Acciones",
    "section.language": "Idioma",
    "tool.fluid": "Fluido",
    "tool.wall": "Pared",
    "tool.eraser": "Borrador",
    "slider.splatRadius": "Radio del pincel",
    "slider.splatForce": "Fuerza del pincel",
    "slider.curl": "Vorticidad",
    "slider.viscosity": "Viscosidad",
    "slider.densityDissipation": "Disip. tinte",
    "slider.velocityDissipation": "Disip. velocidad",
    "slider.bloom": "Bloom",
    "toggle.gravity": "Gravedad",
    "toggle.pause": "Pausar",
    "action.splat": "Splat",
    "action.clear": "Limpiar",
    "action.reset": "Reiniciar",
    hint: "Arrastra en el lienzo para inyectar líquido. La gravedad lo hace caer y acumularse; el espacio vacío es aire y no lo disuelve. Los bordes ya son paredes: usa el Borrador para abrir huecos en ellas o dibuja nuevos obstáculos con Pared. {menu} oculta el panel.",
    "aria.togglePanel": "Mostrar/ocultar controles",
    "aria.collapsePanel": "Ocultar panel",
    "unsupported.title": "Ups, GPU incompatible",
    "preset.water": "Agua",
    "preset.oil": "Aceite",
    "preset.honey": "Miel",
    "preset.ink": "Tinta",
    "preset.smoke": "Humo",
    "preset.mercury": "Mercurio",
    "preset.lava": "Lava",
    "preset.plasma": "Plasma",
    "error.webgl2":
      "Tu navegador no soporta WebGL2, necesario para la simulación. Prueba con un navegador actualizado (Chrome, Edge, Firefox o Safari recientes).",
    "error.colorBufferFloat":
      "Tu GPU no puede renderizar en texturas de punto flotante (EXT_color_buffer_float). La simulación necesita esta función para funcionar con calidad.",
    "error.framebuffer":
      "Tu GPU no pudo crear un framebuffer de punto flotante (RGBA16F). La simulación no puede ejecutarse en este dispositivo/navegador.",
    "error.initFailed": "Error al iniciar la simulación: {msg}",
    "error.unexpected": "Fallo inesperado al iniciar WebGL: {msg}",
    fps: "{fps} FPS · {preset}",
  },
};

const DEFAULT_LANG: Lang = "en-US";
const listeners = new Set<() => void>();
let current: Lang = initialLang();
document.documentElement.lang = current;

// padrão é en-US; só usa outro idioma se o usuário já tiver escolhido um antes
function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("lang");
    if (saved && saved in messages) return saved as Lang;
  } catch {
    // localStorage pode estar bloqueado; segue com o padrão
  }
  return DEFAULT_LANG;
}

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current || !(lang in messages)) return;
  current = lang;
  try {
    localStorage.setItem("lang", lang);
  } catch {
    // sem persistência, mas a troca em runtime ainda vale
  }
  document.documentElement.lang = lang;
  for (const cb of listeners) cb();
}

// registra um callback pra rodar a cada troca de idioma (ex.: redesenhar a UI)
export function onLangChange(cb: () => void): void {
  listeners.add(cb);
}

// traduz uma chave no idioma atual, com fallback pro en-US e interpolação
export function t(key: string, params?: Record<string, string | number>): string {
  let s = messages[current][key] ?? messages["en-US"][key] ?? key;
  if (params) {
    for (const k in params) s = s.replace(`{${k}}`, String(params[k]));
  }
  return s;
}
