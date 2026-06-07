// shaders GLSL ES 3.00 como template strings
// o vertex compartilhado já calcula os vizinhos (L/R/T/B) pros stencils

export const baseVertexShader = /* glsl */ `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// cabeçalho comum dos fragment shaders
const FH = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
`;

export const copyShader = FH + /* glsl */ `
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
void main () {
  fragColor = texture(uTexture, vUv);
}`;

// multiplica por um valor; serve pra fazer a pressão decair a cada frame
export const clearShader = FH + /* glsl */ `
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform float value;
void main () {
  fragColor = value * texture(uTexture, vUv);
}`;

// joga velocidade ou cor num raio gaussiano; não escreve dentro de parede
export const splatShader = FH + /* glsl */ `
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform sampler2D uWalls;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture(uTarget, vUv).xyz;
  float wall = texture(uWalls, vUv).x;
  fragColor = vec4(base + splat * (1.0 - wall), 1.0);
}`;

// pinta ou apaga a máscara de paredes com borda dura
export const wallSplatShader = FH + /* glsl */ `
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec2 point;
uniform float radius;
uniform float value; // 1 = desenhar, 0 = apagar
void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  float inside = step(dot(p, p), radius);
  float base = texture(uTarget, vUv).x;
  float result = (value > 0.5)
    ? max(base, inside)
    : base * (1.0 - inside);
  fragColor = vec4(result, 0.0, 0.0, 1.0);
}`;

// faz uma moldura de paredes nas bordas da área (espessura em texels)
export const wallBorderShader = FH + /* glsl */ `
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform vec2 texelSize;
uniform float thickness; // em texels
void main () {
  float base = texture(uTarget, vUv).x;
  vec2 dims = vec2(1.0) / texelSize;
  vec2 px = vUv * dims;
  float edge = min(min(px.x, dims.x - px.x), min(px.y, dims.y - px.y));
  float border = 1.0 - step(thickness, edge);
  fragColor = vec4(max(base, border), 0.0, 0.0, 1.0);
}`;

// apaga o corante numa área; é o que a borracha usa em cima do dye
export const eraseDyeShader = FH + /* glsl */ `
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  float fall = 1.0 - exp(-dot(p, p) / radius);
  fragColor = vec4(texture(uTarget, vUv).rgb * fall, 1.0);
}`;

// advecção semi-Lagrangiana com bilerp na mão; aguenta sem filtro float linear
export const advectionShader = FH + /* glsl */ `
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform sampler2D uWalls;
uniform vec2 texelSize;     // grade da velocidade
uniform vec2 dyeTexelSize;  // grade da fonte (dye ou velocidade)
uniform float dt;
uniform float dissipation;

vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
  vec2 st = uv / tsize - 0.5;
  vec2 iuv = floor(st);
  vec2 fuv = fract(st);
  vec4 a = texture(sam, (iuv + vec2(0.5, 0.5)) * tsize);
  vec4 b = texture(sam, (iuv + vec2(1.5, 0.5)) * tsize);
  vec4 c = texture(sam, (iuv + vec2(0.5, 1.5)) * tsize);
  vec4 d = texture(sam, (iuv + vec2(1.5, 1.5)) * tsize);
  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}

void main () {
  if (texture(uWalls, vUv).x > 0.5) {
    fragColor = vec4(0.0);
    return;
  }
  vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
  vec4 result = bilerp(uSource, coord, dyeTexelSize);
  float decay = 1.0 + dissipation * dt;
  fragColor = result / decay;
}`;

// divergência com parede refletiva (free-slip)
export const divergenceShader = FH + /* glsl */ `
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uWalls;
void main () {
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (texture(uWalls, vL).x > 0.5) L = -C.x;
  if (texture(uWalls, vR).x > 0.5) R = -C.x;
  if (texture(uWalls, vT).x > 0.5) T = -C.y;
  if (texture(uWalls, vB).x > 0.5) B = -C.y;
  float div = 0.5 * (R - L + T - B);
  fragColor = vec4(div, 0.0, 0.0, 1.0);
}`;

export const curlShader = FH + /* glsl */ `
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  fragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}`;

// vorticity confinement: devolve os redemoinhos que a difusão numérica comeu
export const vorticityShader = FH + /* glsl */ `
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 vel = texture(uVelocity, vUv).xy;
  vel += force * dt;
  vel = clamp(vel, -1000.0, 1000.0);
  fragColor = vec4(vel, 0.0, 1.0);
}`;

// uma iteração de Jacobi da pressão; parede vira Neumann (gradiente normal 0)
export const pressureShader = FH + /* glsl */ `
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform sampler2D uWalls;
void main () {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float C = texture(uPressure, vUv).x;
  if (texture(uWalls, vL).x > 0.5) L = C;
  if (texture(uWalls, vR).x > 0.5) R = C;
  if (texture(uWalls, vT).x > 0.5) T = C;
  if (texture(uWalls, vB).x > 0.5) B = C;
  float divergence = texture(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  fragColor = vec4(pressure, 0.0, 0.0, 1.0);
}`;

// tira o gradiente de pressão; zera a velocidade dentro de parede
export const gradientSubtractShader = FH + /* glsl */ `
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform sampler2D uWalls;
void main () {
  if (texture(uWalls, vUv).x > 0.5) {
    fragColor = vec4(0.0);
    return;
  }
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float C = texture(uPressure, vUv).x;
  if (texture(uWalls, vL).x > 0.5) L = C;
  if (texture(uWalls, vR).x > 0.5) R = C;
  if (texture(uWalls, vT).x > 0.5) T = C;
  if (texture(uWalls, vB).x > 0.5) B = C;
  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B) * 0.5;
  fragColor = vec4(velocity, 0.0, 1.0);
}`;

// viscosidade aproximada: puxa a velocidade pra média dos vizinhos
export const viscosityShader = FH + /* glsl */ `
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uWalls;
uniform float v; // 0 = nenhuma .. ~0.3 = espessa
void main () {
  vec2 C = texture(uVelocity, vUv).xy;
  if (texture(uWalls, vUv).x > 0.5) {
    fragColor = vec4(0.0);
    return;
  }
  vec2 L = texture(uVelocity, vL).xy;
  vec2 R = texture(uVelocity, vR).xy;
  vec2 T = texture(uVelocity, vT).xy;
  vec2 B = texture(uVelocity, vB).xy;
  vec2 avg = (L + R + T + B) * 0.25;
  fragColor = vec4(mix(C, avg, v), 0.0, 1.0);
}`;

// empuxo/gravidade proporcional à densidade do dye
export const buoyancyShader = FH + /* glsl */ `
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uDye;
uniform sampler2D uWalls;
uniform vec2 gravity;
uniform float dt;
void main () {
  if (texture(uWalls, vUv).x > 0.5) {
    fragColor = vec4(0.0);
    return;
  }
  vec3 c = texture(uDye, vUv).rgb;
  float d = dot(c, vec3(0.299, 0.587, 0.114));
  vec2 vel = texture(uVelocity, vUv).xy;
  vel += gravity * d * dt;
  fragColor = vec4(vel, 0.0, 1.0);
}`;

// pós: pega só as áreas brilhantes, já multiplicadas pela emissão do preset
export const bloomPrefilterShader = FH + /* glsl */ `
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform float threshold;
uniform float emissive;
void main () {
  vec3 c = texture(uTexture, vUv).rgb * max(emissive, 0.15);
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - threshold, 0.0, 1.0);
  fragColor = vec4(c * soft, 1.0);
}`;

// blur gaussiano separável, rodado em H e depois em V
export const bloomBlurShader = FH + /* glsl */ `
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform vec2 direction;
void main () {
  vec3 sum = texture(uTexture, vUv).rgb * 0.2270270270;
  sum += texture(uTexture, vUv + direction * 1.3846153846).rgb * 0.3162162162;
  sum += texture(uTexture, vUv - direction * 1.3846153846).rgb * 0.3162162162;
  sum += texture(uTexture, vUv + direction * 3.2307692308).rgb * 0.0702702703;
  sum += texture(uTexture, vUv - direction * 3.2307692308).rgb * 0.0702702703;
  fragColor = vec4(sum, 1.0);
}`;

// render final: normal fake do gradiente do dye, Lambert + specular, emissão,
// paredes por cima, bloom aditivo, tonemap ACES e vinheta
export const displayShader = FH + /* glsl */ `
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform sampler2D uBloom;
uniform sampler2D uWalls;
uniform float uEmissive;
uniform float uSpecular;
uniform float uShininess;
uniform float uBloomIntensity;
uniform vec3 uWallColor;
uniform vec3 uBackground;

float luma (vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

vec3 aces (vec3 x) {
  float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main () {
  float wall = texture(uWalls, vUv).x;
  vec3 col;

  if (wall > 0.5) {
    float wl = texture(uWalls, vL).x;
    float wr = texture(uWalls, vR).x;
    float wt = texture(uWalls, vT).x;
    float wb = texture(uWalls, vB).x;
    vec3 n = normalize(vec3(wl - wr, wb - wt, 1.5));
    float d = max(dot(n, normalize(vec3(0.5, 0.7, 1.0))), 0.0);
    col = uWallColor * (0.55 + 0.7 * d);
  } else {
    vec3 c = texture(uTexture, vUv).rgb;
    float lL = luma(texture(uTexture, vL).rgb);
    float lR = luma(texture(uTexture, vR).rgb);
    float lT = luma(texture(uTexture, vT).rgb);
    float lB = luma(texture(uTexture, vB).rgb);
    vec3 n = normalize(vec3(lL - lR, lB - lT, 0.55));
    vec3 lightDir = normalize(vec3(0.4, 0.6, 1.0));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 h = normalize(lightDir + viewDir);
    float diff = max(dot(n, lightDir), 0.0);
    float spec = pow(max(dot(n, h), 0.0), uShininess) * uSpecular;
    vec3 lit = c * (0.35 + 0.85 * diff) + vec3(spec);
    vec3 emis = c * uEmissive * 2.2;
    vec3 fluid = lit + emis;
    float presence = clamp(luma(c) * 3.5, 0.0, 1.0);
    col = mix(uBackground, fluid, presence);
  }

  col += texture(uBloom, vUv).rgb * uBloomIntensity;
  col = aces(col);

  vec2 q = vUv - 0.5;
  float vig = smoothstep(1.1, 0.25, dot(q, q) * 2.2);
  col *= mix(0.72, 1.0, vig);

  fragColor = vec4(col, 1.0);
}`;
