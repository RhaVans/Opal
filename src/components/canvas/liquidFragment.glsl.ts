export const LIQUID_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export const LIQUID_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_calmness;

varying vec2 vUv;

// Brand Palette (Addendum A Section 2 & Ref 4)
const vec3 C_LAVENDER = vec3(0.882, 0.855, 0.984);       // #E1DAFB
const vec3 C_PETAL    = vec3(1.000, 0.824, 0.957);       // #FFD2F4
const vec3 C_GLAUCOUS = vec3(0.459, 0.541, 0.820);       // #758AD1
const vec3 C_PERSIAN  = vec3(0.302, 0.243, 0.639);       // #4D3EA3
const vec3 C_VIOLET   = vec3(0.271, 0.047, 0.247);       // #450C3F

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
    -0.577350269189626,
    0.024390243902439
  );
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.52;
  for (int i = 0; i < 4; i++) {
    value += amp * snoise(p);
    p = p * 1.92 + vec2(1.7, -1.3);
    amp *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = vUv;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);

  // Fan center near upper-middle per Addendum A Section 8
  vec2 origin = vec2(0.5, 0.74);
  vec2 p = (uv - origin) * vec2(aspect, 1.0);

  // Subtle pointer influence
  vec2 ptr = (u_pointer - 0.5) * 0.14;
  p += ptr * (1.0 - 0.6 * u_calmness);

  float speedScale = mix(1.0, 0.35, clamp(u_calmness, 0.0, 1.0));
  float t = u_time * speedScale;

  // Gentle angular wedges before 2-pass domain warping (Addendum A Section 8)
  float angle = atan(p.y, p.x);
  float wedge = 0.5 + 0.5 * sin(angle * 2.5 + t * 0.45);
  float radial = length(p);

  // 2-pass domain warp
  vec2 q = vec2(
    fbm(p * 1.35 + vec2(t * 0.18, -t * 0.12)),
    fbm(p * 1.35 + vec2(5.2 - t * 0.14, 1.3 + t * 0.16))
  );
  vec2 r = vec2(
    fbm(p * 1.65 + 1.8 * q + vec2(1.7 + t * 0.11, 9.2)),
    fbm(p * 1.65 + 1.8 * q + vec2(8.3, 2.8 - t * 0.13))
  );
  float f = clamp(0.5 + 0.5 * fbm(p * 1.2 + 1.45 * r), 0.0, 1.0);

  // Blend the 5 brand colors smoothly: light lavender/petal in center, glaucous flank, persian & midnight violet corners
  vec3 centerGlow = mix(C_LAVENDER, C_PETAL, smoothstep(0.18, 0.85, wedge * 0.65 + f * 0.45));
  vec3 sideTone   = mix(C_GLAUCOUS, C_PERSIAN, smoothstep(0.25, 0.9, f * 0.75 + (1.0 - wedge) * 0.35));
  vec3 cornerDeep = mix(C_PERSIAN, C_VIOLET, smoothstep(0.35, 1.05, radial + f * 0.25));

  vec3 col = mix(centerGlow, sideTone, smoothstep(0.15, 0.75, radial * 0.85 + f * 0.22));
  col = mix(col, cornerDeep, smoothstep(0.58, 1.28, radial + 0.18 * (1.0 - wedge)));

  // Calmness softens contrast on study/drills/cbt routes toward lavender mist
  col = mix(col, mix(C_LAVENDER, C_PETAL, 0.32), 0.28 * clamp(u_calmness, 0.0, 1.0));

  gl_FragColor = vec4(col, 1.0);
}
`;
