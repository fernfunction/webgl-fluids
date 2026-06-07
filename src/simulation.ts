import {
  Blitter,
  Program,
  createDoubleFBO,
  createFBO,
  resizeDoubleFBO,
  type GLContext,
} from "./gl-utils";
import * as S from "./shaders";
import type { Config, DoubleFBO, FBO } from "./types";

const WALL_COLOR: [number, number, number] = [0.4, 0.44, 0.52];
const BACKGROUND: [number, number, number] = [0.012, 0.014, 0.022];

// toca o pipeline de Stable Fluids a cada frame (§2 do plano)
export class FluidSimulation {
  private gl: WebGL2RenderingContext;
  private glx: GLContext;
  private blitter: Blitter;
  private config: Config;

  // programas
  private copy: Program;
  private clear: Program;
  private splat: Program;
  private wallSplat: Program;
  private wallBorder: Program;
  private eraseDye: Program;
  private advection: Program;
  private divergence: Program;
  private curl: Program;
  private vorticity: Program;
  private pressure: Program;
  private gradientSubtract: Program;
  private viscosity: Program;
  private buoyancy: Program;
  private bloomPrefilter: Program;
  private bloomBlur: Program;
  private display: Program;

  // campos
  private velocity!: DoubleFBO;
  private dye!: DoubleFBO;
  private pressureFBO!: DoubleFBO;
  private walls!: DoubleFBO;
  private divergenceFBO!: FBO;
  private curlFBO!: FBO;
  private bloom!: DoubleFBO;

  private linearFilter: number;

  constructor(glx: GLContext, config: Config) {
    this.glx = glx;
    this.gl = glx.gl;
    this.config = config;
    this.blitter = new Blitter(this.gl);
    this.linearFilter = glx.supportLinearFiltering
      ? this.gl.LINEAR
      : this.gl.NEAREST;

    const gl = this.gl;
    this.copy = new Program(gl, S.baseVertexShader, S.copyShader);
    this.clear = new Program(gl, S.baseVertexShader, S.clearShader);
    this.splat = new Program(gl, S.baseVertexShader, S.splatShader);
    this.wallSplat = new Program(gl, S.baseVertexShader, S.wallSplatShader);
    this.wallBorder = new Program(gl, S.baseVertexShader, S.wallBorderShader);
    this.eraseDye = new Program(gl, S.baseVertexShader, S.eraseDyeShader);
    this.advection = new Program(gl, S.baseVertexShader, S.advectionShader);
    this.divergence = new Program(gl, S.baseVertexShader, S.divergenceShader);
    this.curl = new Program(gl, S.baseVertexShader, S.curlShader);
    this.vorticity = new Program(gl, S.baseVertexShader, S.vorticityShader);
    this.pressure = new Program(gl, S.baseVertexShader, S.pressureShader);
    this.gradientSubtract = new Program(
      gl,
      S.baseVertexShader,
      S.gradientSubtractShader
    );
    this.viscosity = new Program(gl, S.baseVertexShader, S.viscosityShader);
    this.buoyancy = new Program(gl, S.baseVertexShader, S.buoyancyShader);
    this.bloomPrefilter = new Program(
      gl,
      S.baseVertexShader,
      S.bloomPrefilterShader
    );
    this.bloomBlur = new Program(gl, S.baseVertexShader, S.bloomBlurShader);
    this.display = new Program(gl, S.baseVertexShader, S.displayShader);

    this.initFramebuffers();
  }

  // acha as dimensões (lado maior = resolution) respeitando o aspecto
  private getResolution(resolution: number): { width: number; height: number } {
    const gl = this.gl;
    let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspect < 1) aspect = 1 / aspect;
    const min = Math.round(resolution);
    const max = Math.round(resolution * aspect);
    if (gl.drawingBufferWidth > gl.drawingBufferHeight)
      return { width: max, height: min };
    return { width: min, height: max };
  }

  private initFramebuffers(): void {
    const gl = this.gl;
    const { halfFloat } = this.glx;
    const sim = this.getResolution(this.config.simResolution);
    const dyeRes = this.getResolution(this.config.dyeResolution);
    const bloomRes = this.getResolution(this.config.bloomResolution);
    const rgba = this.glx.formatRGBA;
    const rg = this.glx.formatRG;
    const r = this.glx.formatR;

    this.dye = createDoubleFBO(
      gl,
      dyeRes.width,
      dyeRes.height,
      rgba.internalFormat,
      rgba.format,
      halfFloat,
      this.linearFilter
    );
    this.velocity = createDoubleFBO(
      gl,
      sim.width,
      sim.height,
      rg.internalFormat,
      rg.format,
      halfFloat,
      this.linearFilter
    );
    this.pressureFBO = createDoubleFBO(
      gl,
      sim.width,
      sim.height,
      r.internalFormat,
      r.format,
      halfFloat,
      gl.NEAREST
    );
    this.divergenceFBO = createFBO(
      gl,
      sim.width,
      sim.height,
      r.internalFormat,
      r.format,
      halfFloat,
      gl.NEAREST
    );
    this.curlFBO = createFBO(
      gl,
      sim.width,
      sim.height,
      r.internalFormat,
      r.format,
      halfFloat,
      gl.NEAREST
    );
    // paredes na resolução da sim, que é onde o solver consulta
    this.walls = createDoubleFBO(
      gl,
      sim.width,
      sim.height,
      r.internalFormat,
      r.format,
      halfFloat,
      gl.NEAREST
    );
    this.bloom = createDoubleFBO(
      gl,
      bloomRes.width,
      bloomRes.height,
      rgba.internalFormat,
      rgba.format,
      halfFloat,
      this.linearFilter
    );
  }

  // responde ao canvas mudar de tamanho sem perder os campos visíveis
  resize(): void {
    const gl = this.gl;
    const { halfFloat } = this.glx;
    const sim = this.getResolution(this.config.simResolution);
    const dyeRes = this.getResolution(this.config.dyeResolution);
    const rgba = this.glx.formatRGBA;
    const rg = this.glx.formatRG;
    const r = this.glx.formatR;

    this.dye = resizeDoubleFBO(
      gl,
      this.blitter,
      this.copy,
      this.dye,
      dyeRes.width,
      dyeRes.height,
      rgba.internalFormat,
      rgba.format,
      halfFloat,
      this.linearFilter
    );
    this.velocity = resizeDoubleFBO(
      gl,
      this.blitter,
      this.copy,
      this.velocity,
      sim.width,
      sim.height,
      rg.internalFormat,
      rg.format,
      halfFloat,
      this.linearFilter
    );
    this.walls = resizeDoubleFBO(
      gl,
      this.blitter,
      this.copy,
      this.walls,
      sim.width,
      sim.height,
      r.internalFormat,
      r.format,
      halfFloat,
      gl.NEAREST
    );
    // esses campos não guardam estado, então só recrio no tamanho novo
    if (
      this.pressureFBO.width !== sim.width ||
      this.pressureFBO.height !== sim.height
    ) {
      this.pressureFBO = createDoubleFBO(
        gl,
        sim.width,
        sim.height,
        r.internalFormat,
        r.format,
        halfFloat,
        gl.NEAREST
      );
      this.divergenceFBO = createFBO(
        gl,
        sim.width,
        sim.height,
        r.internalFormat,
        r.format,
        halfFloat,
        gl.NEAREST
      );
      this.curlFBO = createFBO(
        gl,
        sim.width,
        sim.height,
        r.internalFormat,
        r.format,
        halfFloat,
        gl.NEAREST
      );
    }
  }

  // seta o texelSize do programa que está ligado agora
  private setTexel(p: Program, w: number, h: number): void {
    this.gl.uniform2f(p.uniforms.texelSize, 1 / w, 1 / h);
  }

  // roda um passo completo da sim
  step(dt: number): void {
    const gl = this.gl;
    const vel = this.velocity;
    const cfg = this.config;

    gl.disable(gl.BLEND);

    // 1. curl
    this.curl.bind();
    this.setTexel(this.curl, vel.width, vel.height);
    gl.uniform1i(this.curl.uniforms.uVelocity, vel.read.attach(0));
    this.blitter.blit(this.curlFBO);

    // 2. vorticity confinement
    this.vorticity.bind();
    this.setTexel(this.vorticity, vel.width, vel.height);
    gl.uniform1i(this.vorticity.uniforms.uVelocity, vel.read.attach(0));
    gl.uniform1i(this.vorticity.uniforms.uCurl, this.curlFBO.attach(1));
    gl.uniform1f(this.vorticity.uniforms.curl, cfg.curl);
    gl.uniform1f(this.vorticity.uniforms.dt, dt);
    this.blitter.blit(vel.write);
    vel.swap();

    // 3. viscosidade, opcional por preset
    if (cfg.viscosity > 0.001) {
      this.viscosity.bind();
      this.setTexel(this.viscosity, vel.width, vel.height);
      gl.uniform1f(this.viscosity.uniforms.v, cfg.viscosity);
      for (let i = 0; i < cfg.viscosityIterations; i++) {
        gl.uniform1i(this.viscosity.uniforms.uVelocity, vel.read.attach(0));
        gl.uniform1i(this.viscosity.uniforms.uWalls, this.walls.read.attach(1));
        this.blitter.blit(vel.write);
        vel.swap();
      }
    }

    // 4. forças externas: empuxo/gravidade
    if (cfg.gravityEnabled && (cfg.gravity[0] !== 0 || cfg.gravity[1] !== 0)) {
      this.buoyancy.bind();
      this.setTexel(this.buoyancy, vel.width, vel.height);
      gl.uniform1i(this.buoyancy.uniforms.uVelocity, vel.read.attach(0));
      gl.uniform1i(this.buoyancy.uniforms.uDye, this.dye.read.attach(1));
      gl.uniform1i(this.buoyancy.uniforms.uWalls, this.walls.read.attach(2));
      gl.uniform2f(
        this.buoyancy.uniforms.gravity,
        cfg.gravity[0],
        cfg.gravity[1]
      );
      gl.uniform1f(this.buoyancy.uniforms.dt, dt);
      this.blitter.blit(vel.write);
      vel.swap();
    }

    // 5. divergência
    this.divergence.bind();
    this.setTexel(this.divergence, vel.width, vel.height);
    gl.uniform1i(this.divergence.uniforms.uVelocity, vel.read.attach(0));
    gl.uniform1i(this.divergence.uniforms.uWalls, this.walls.read.attach(1));
    this.blitter.blit(this.divergenceFBO);

    // 6. pressão decaindo
    this.clear.bind();
    gl.uniform1i(this.clear.uniforms.uTexture, this.pressureFBO.read.attach(0));
    gl.uniform1f(this.clear.uniforms.value, cfg.pressure);
    this.blitter.blit(this.pressureFBO.write);
    this.pressureFBO.swap();

    // 6b. pressão (Jacobi)
    this.pressure.bind();
    this.setTexel(this.pressure, vel.width, vel.height);
    gl.uniform1i(this.pressure.uniforms.uDivergence, this.divergenceFBO.attach(0));
    for (let i = 0; i < cfg.pressureIterations; i++) {
      gl.uniform1i(
        this.pressure.uniforms.uPressure,
        this.pressureFBO.read.attach(1)
      );
      gl.uniform1i(this.pressure.uniforms.uWalls, this.walls.read.attach(2));
      this.blitter.blit(this.pressureFBO.write);
      this.pressureFBO.swap();
    }

    // 7. subtrai o gradiente
    this.gradientSubtract.bind();
    this.setTexel(this.gradientSubtract, vel.width, vel.height);
    gl.uniform1i(
      this.gradientSubtract.uniforms.uPressure,
      this.pressureFBO.read.attach(0)
    );
    gl.uniform1i(this.gradientSubtract.uniforms.uVelocity, vel.read.attach(1));
    gl.uniform1i(
      this.gradientSubtract.uniforms.uWalls,
      this.walls.read.attach(2)
    );
    this.blitter.blit(vel.write);
    vel.swap();

    // 8. advecta a velocidade
    this.advection.bind();
    this.setTexel(this.advection, vel.width, vel.height);
    gl.uniform2f(
      this.advection.uniforms.dyeTexelSize,
      vel.texelSizeX,
      vel.texelSizeY
    );
    gl.uniform1i(this.advection.uniforms.uVelocity, vel.read.attach(0));
    gl.uniform1i(this.advection.uniforms.uSource, vel.read.attach(0));
    gl.uniform1i(this.advection.uniforms.uWalls, this.walls.read.attach(1));
    gl.uniform1f(this.advection.uniforms.dt, dt);
    gl.uniform1f(
      this.advection.uniforms.dissipation,
      cfg.velocityDissipation
    );
    this.blitter.blit(vel.write);
    vel.swap();

    // 9. advecta o corante
    this.advection.bind();
    this.setTexel(this.advection, vel.width, vel.height);
    gl.uniform2f(
      this.advection.uniforms.dyeTexelSize,
      this.dye.texelSizeX,
      this.dye.texelSizeY
    );
    gl.uniform1i(this.advection.uniforms.uVelocity, vel.read.attach(0));
    gl.uniform1i(this.advection.uniforms.uSource, this.dye.read.attach(1));
    gl.uniform1i(this.advection.uniforms.uWalls, this.walls.read.attach(2));
    gl.uniform1f(this.advection.uniforms.dt, dt);
    gl.uniform1f(
      this.advection.uniforms.dissipation,
      cfg.densityDissipation
    );
    this.blitter.blit(this.dye.write);
    this.dye.swap();
  }

  // joga velocidade + cor num ponto (o pincel de fluido)
  splatPointer(
    x: number,
    y: number,
    dx: number,
    dy: number,
    color: [number, number, number]
  ): void {
    const gl = this.gl;
    // velocidade
    this.splat.bind();
    gl.uniform1f(
      this.splat.uniforms.aspectRatio,
      gl.drawingBufferWidth / gl.drawingBufferHeight
    );
    gl.uniform1i(this.splat.uniforms.uTarget, this.velocity.read.attach(0));
    gl.uniform1i(this.splat.uniforms.uWalls, this.walls.read.attach(1));
    gl.uniform2f(this.splat.uniforms.point, x, y);
    gl.uniform3f(this.splat.uniforms.color, dx, dy, 0);
    gl.uniform1f(
      this.splat.uniforms.radius,
      this.correctRadius(this.config.splatRadius / 100)
    );
    this.blitter.blit(this.velocity.write);
    this.velocity.swap();

    // corante
    gl.uniform1i(this.splat.uniforms.uTarget, this.dye.read.attach(0));
    gl.uniform1i(this.splat.uniforms.uWalls, this.walls.read.attach(1));
    gl.uniform3f(this.splat.uniforms.color, color[0], color[1], color[2]);
    this.blitter.blit(this.dye.write);
    this.dye.swap();
  }

  // monta a moldura de paredes nas bordas (o padrão da sandbox)
  seedBorders(): void {
    const gl = this.gl;
    this.wallBorder.bind();
    this.setTexel(this.wallBorder, this.walls.width, this.walls.height);
    gl.uniform1i(this.wallBorder.uniforms.uTarget, this.walls.read.attach(0));
    gl.uniform1f(
      this.wallBorder.uniforms.thickness,
      this.config.borderThickness
    );
    this.blitter.blit(this.walls.write);
    this.walls.swap();
  }

  // desenha (value=1) ou apaga (value=0) parede num ponto
  paintWall(x: number, y: number, draw: boolean): void {
    const gl = this.gl;
    this.wallSplat.bind();
    gl.uniform1f(
      this.wallSplat.uniforms.aspectRatio,
      gl.drawingBufferWidth / gl.drawingBufferHeight
    );
    gl.uniform1i(this.wallSplat.uniforms.uTarget, this.walls.read.attach(0));
    gl.uniform2f(this.wallSplat.uniforms.point, x, y);
    gl.uniform1f(this.wallSplat.uniforms.value, draw ? 1 : 0);
    gl.uniform1f(
      this.wallSplat.uniforms.radius,
      this.correctRadius(this.config.splatRadius / 100)
    );
    this.blitter.blit(this.walls.write);
    this.walls.swap();
  }

  // apaga o corante numa área (a borracha em cima do dye)
  eraseDyeAt(x: number, y: number): void {
    const gl = this.gl;
    this.eraseDye.bind();
    gl.uniform1f(
      this.eraseDye.uniforms.aspectRatio,
      gl.drawingBufferWidth / gl.drawingBufferHeight
    );
    gl.uniform1i(this.eraseDye.uniforms.uTarget, this.dye.read.attach(0));
    gl.uniform2f(this.eraseDye.uniforms.point, x, y);
    gl.uniform1f(
      this.eraseDye.uniforms.radius,
      this.correctRadius(this.config.splatRadius / 100)
    );
    this.blitter.blit(this.dye.write);
    this.dye.swap();
  }

  private correctRadius(radius: number): number {
    const aspect = this.gl.drawingBufferWidth / this.gl.drawingBufferHeight;
    return aspect > 1 ? radius * aspect : radius;
  }

  // passa o bloom (prefilter + blur ping-pong) e joga tudo na tela
  render(): void {
    const gl = this.gl;
    this.applyBloom();

    this.display.bind();
    this.setTexel(
      this.display,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight
    );
    gl.uniform1i(this.display.uniforms.uTexture, this.dye.read.attach(0));
    gl.uniform1i(this.display.uniforms.uBloom, this.bloom.read.attach(1));
    gl.uniform1i(this.display.uniforms.uWalls, this.walls.read.attach(2));
    gl.uniform1f(this.display.uniforms.uEmissive, this.config.emissive);
    gl.uniform1f(this.display.uniforms.uSpecular, this.config.specular);
    gl.uniform1f(this.display.uniforms.uShininess, this.config.shininess);
    gl.uniform1f(this.display.uniforms.uBloomIntensity, this.config.bloom);
    gl.uniform3f(
      this.display.uniforms.uWallColor,
      WALL_COLOR[0],
      WALL_COLOR[1],
      WALL_COLOR[2]
    );
    gl.uniform3f(
      this.display.uniforms.uBackground,
      BACKGROUND[0],
      BACKGROUND[1],
      BACKGROUND[2]
    );
    this.blitter.blit(null);
  }

  private applyBloom(): void {
    const gl = this.gl;
    const bloom = this.bloom;

    this.bloomPrefilter.bind();
    gl.uniform1i(this.bloomPrefilter.uniforms.uTexture, this.dye.read.attach(0));
    gl.uniform1f(
      this.bloomPrefilter.uniforms.threshold,
      this.config.bloomThreshold
    );
    gl.uniform1f(
      this.bloomPrefilter.uniforms.emissive,
      Math.max(this.config.emissive, 0.1)
    );
    this.blitter.blit(bloom.write);
    bloom.swap();

    this.bloomBlur.bind();
    const passes = 4;
    for (let i = 0; i < passes; i++) {
      gl.uniform1i(this.bloomBlur.uniforms.uTexture, bloom.read.attach(0));
      gl.uniform2f(this.bloomBlur.uniforms.direction, bloom.texelSizeX, 0);
      this.blitter.blit(bloom.write);
      bloom.swap();

      gl.uniform1i(this.bloomBlur.uniforms.uTexture, bloom.read.attach(0));
      gl.uniform2f(this.bloomBlur.uniforms.direction, 0, bloom.texelSizeY);
      this.blitter.blit(bloom.write);
      bloom.swap();
    }
  }

  // limpa só corante e velocidade, mantendo as paredes
  clearFluid(): void {
    this.clearDouble(this.dye);
    this.clearDouble(this.velocity);
    this.clearDouble(this.pressureFBO);
  }

  // reset total: limpa o fluido e devolve as paredes de borda
  reset(): void {
    this.clearFluid();
    this.clearDouble(this.walls);
    this.seedBorders();
  }

  private clearDouble(target: DoubleFBO): void {
    const gl = this.gl;
    this.clear.bind();
    gl.uniform1f(this.clear.uniforms.value, 0);
    gl.uniform1i(this.clear.uniforms.uTexture, target.read.attach(0));
    this.blitter.blit(target.write);
    target.swap();
    gl.uniform1i(this.clear.uniforms.uTexture, target.read.attach(0));
    this.blitter.blit(target.write);
    target.swap();
  }
}
