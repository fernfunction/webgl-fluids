import type { DoubleFBO, FBO, TexFormat } from "./types";

// o que a GPU consegue fazer, descoberto no init
export interface GLContext {
  gl: WebGL2RenderingContext;
  formatRGBA: TexFormat;
  formatRG: TexFormat;
  formatR: TexFormat;
  // tipo das texturas da sim, de preferência HALF_FLOAT
  halfFloat: number;
  // se dá pra usar filtragem linear em textura float
  supportLinearFiltering: boolean;
}

export class GLInitError extends Error {}

// vê se dá pra renderizar num framebuffer RGBA16F de verdade
function canRenderToHalfFloat(gl: WebGL2RenderingContext): boolean {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 4, 4, 0, gl.RGBA, gl.HALF_FLOAT, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  );
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fbo);
  gl.deleteTexture(tex);
  return status === gl.FRAMEBUFFER_COMPLETE;
}

// cria o contexto WebGL2 e resolve formatos/extensões; estoura se falhar
export function createGLContext(canvas: HTMLCanvasElement): GLContext {
  const params: WebGLContextAttributes = {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  };

  const gl = canvas.getContext("webgl2", params);
  if (!gl) {
    throw new GLInitError(
      "Seu navegador não suporta WebGL2, necessário para a simulação. Tente um navegador atualizado (Chrome, Edge, Firefox ou Safari recentes)."
    );
  }

  const colorBufferFloat = gl.getExtension("EXT_color_buffer_float");
  // as texturas da sim são todas HALF_FLOAT, então o que vale pra filtragem
  // linear é OES_texture_half_float_linear, e não o ..._float_linear (esse
  // cobre só 32F). o Firefox, por exemplo, tem um mas não o outro; usar LINEAR
  // em half-float sem isso deixa a textura incompleta (amostra vem preta) e a
  // sim simplesmente não aparece
  const supportLinearFiltering = !!gl.getExtension(
    "OES_texture_half_float_linear"
  );

  if (!colorBufferFloat) {
    throw new GLInitError(
      "Sua GPU não permite renderizar em texturas de ponto flutuante (EXT_color_buffer_float). A simulação precisa desse recurso para funcionar com qualidade."
    );
  }

  const halfFloat = gl.HALF_FLOAT;

  // confere na prática que dá pra renderizar em half-float; tem device que
  // expõe a extensão mas falha na completude do framebuffer
  if (!canRenderToHalfFloat(gl)) {
    throw new GLInitError(
      "Sua GPU não conseguiu criar um framebuffer de ponto flutuante (RGBA16F). A simulação não pode rodar neste dispositivo/navegador."
    );
  }

  const ctx: GLContext = {
    gl,
    halfFloat,
    supportLinearFiltering,
    formatRGBA: { internalFormat: gl.RGBA16F, format: gl.RGBA },
    formatRG: { internalFormat: gl.RG16F, format: gl.RG },
    formatR: { internalFormat: gl.R16F, format: gl.RED },
  };

  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);

  return ctx;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Falha ao criar shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Erro ao compilar shader:\n" + log + "\n\n" + source);
  }
  return shader;
}

export type Uniforms = Record<string, WebGLUniformLocation | null>;

// programa já compilado, com as localizações de uniform em cache
export class Program {
  readonly program: WebGLProgram;
  readonly uniforms: Uniforms = {};
  private gl: WebGL2RenderingContext;

  constructor(gl: WebGL2RenderingContext, vsSource: string, fsSource: string) {
    this.gl = gl;
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    if (!program) throw new Error("Falha ao criar programa");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    // prende o atributo de posição na location 0 pra um VAO só servir pra todos
    gl.bindAttribLocation(program, 0, "aPosition");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      throw new Error("Erro ao linkar programa:\n" + log);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    this.program = program;

    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (!info) continue;
      const name = info.name.replace(/\[0\]$/, "");
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
  }

  bind(): void {
    this.gl.useProgram(this.program);
  }
}

// quad de tela cheia + VAO que todos os passes compartilham
export class Blitter {
  private gl: WebGL2RenderingContext;
  private vao: WebGLVertexArrayObject;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Falha ao criar VAO");
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      gl.STATIC_DRAW
    );
    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.vao = vao;
  }

  // desenha o quad; target null cai no canvas
  blit(target: FBO | null, clear = false): void {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    if (target == null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    if (clear) {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
}

export function createFBO(
  gl: WebGL2RenderingContext,
  w: number,
  h: number,
  internalFormat: number,
  format: number,
  type: number,
  filter: number
): FBO {
  gl.activeTexture(gl.TEXTURE0);
  const texture = gl.createTexture();
  if (!texture) throw new Error("Falha ao criar textura");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

  const fbo = gl.createFramebuffer();
  if (!fbo) throw new Error("Falha ao criar framebuffer");
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0
  );
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const texelSizeX = 1 / w;
  const texelSizeY = 1 / h;

  return {
    texture,
    fbo,
    width: w,
    height: h,
    texelSizeX,
    texelSizeY,
    attach(unit: number) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return unit;
    },
  };
}

export function createDoubleFBO(
  gl: WebGL2RenderingContext,
  w: number,
  h: number,
  internalFormat: number,
  format: number,
  type: number,
  filter: number
): DoubleFBO {
  let fbo1 = createFBO(gl, w, h, internalFormat, format, type, filter);
  let fbo2 = createFBO(gl, w, h, internalFormat, format, type, filter);
  return {
    width: w,
    height: h,
    texelSizeX: fbo1.texelSizeX,
    texelSizeY: fbo1.texelSizeY,
    get read() {
      return fbo1;
    },
    set read(v: FBO) {
      fbo1 = v;
    },
    get write() {
      return fbo2;
    },
    set write(v: FBO) {
      fbo2 = v;
    },
    swap() {
      const tmp = fbo1;
      fbo1 = fbo2;
      fbo2 = tmp;
    },
  };
}

// recria um FBO num novo tamanho copiando o conteúdo antigo
export function resizeFBO(
  gl: WebGL2RenderingContext,
  blitter: Blitter,
  copyProgram: Program,
  target: FBO,
  w: number,
  h: number,
  internalFormat: number,
  format: number,
  type: number,
  filter: number
): FBO {
  const newFBO = createFBO(gl, w, h, internalFormat, format, type, filter);
  copyProgram.bind();
  gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
  blitter.blit(newFBO);
  return newFBO;
}

export function resizeDoubleFBO(
  gl: WebGL2RenderingContext,
  blitter: Blitter,
  copyProgram: Program,
  target: DoubleFBO,
  w: number,
  h: number,
  internalFormat: number,
  format: number,
  type: number,
  filter: number
): DoubleFBO {
  if (target.width === w && target.height === h) return target;
  target.read = resizeFBO(
    gl,
    blitter,
    copyProgram,
    target.read,
    w,
    h,
    internalFormat,
    format,
    type,
    filter
  );
  target.write = createFBO(gl, w, h, internalFormat, format, type, filter);
  target.width = w;
  target.height = h;
  target.texelSizeX = 1 / w;
  target.texelSizeY = 1 / h;
  return target;
}
