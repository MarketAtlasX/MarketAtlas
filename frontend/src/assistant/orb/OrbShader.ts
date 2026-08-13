import * as THREE from 'three'

export const ORB_MODE: Record<string, number> = {
  IDLE: 0,
  LISTENING: 1,
  THINKING: 2,
  SPEAKING: 3,
  NAVIGATING: 4,
  ANALYZING: 5,
  SIMULATING: 6,
  ERROR: 7,
}

export interface OrbUniforms {
  uTime: { value: number }
  uAmplitude: { value: number }
  uMode: { value: number }
  uColorA: { value: THREE.Color }
  uColorB: { value: THREE.Color }
  [key: string]: { value: number | THREE.Color }
}

export function createOrbUniforms(): OrbUniforms {
  return {
    uTime: { value: 0 },
    uAmplitude: { value: 0 },
    uMode: { value: ORB_MODE.IDLE },
    uColorA: { value: new THREE.Color('#38e8ff') },
    uColorB: { value: new THREE.Color('#9adcf0') },
  }
}

export const ORB_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uMode;

  varying float vAlpha;
  varying float vPhase;

  mat3 rotY(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
  }

  void main() {
    vec3 p = position;
    float t = uTime;
    float a = uAmplitude;
    float r = length(p);
    float mode = uMode;

    vPhase = position.x * 6.28318 + position.y * 3.14159;

    if (mode < 1.5) {
      // LISTENING — particles breathe inward with the microphone.
      float pull = smoothstep(1.4, 0.2, r) * (0.03 + a * 0.4);
      p *= 1.0 - pull;
      p.y += sin(t * 9.0 + position.x * 9.0) * a * 0.06;
    } else if (mode < 2.5) {
      // THINKING — a slow data swirl.
      p = rotY(t * 0.7) * p;
      p *= 1.0 + sin(t * 2.2 + r * 5.0) * 0.035;
    } else if (mode < 3.5) {
      // SPEAKING — the orb breathes with the voice.
      float pulse = 1.0 + a * 0.22;
      p *= pulse;
      p.y += sin(t * 8.0 + position.z * 6.0) * a * 0.05;
    } else {
      // IDLE / other — subtle drift.
      p.x += sin(t * 0.4 + position.z * 3.0) * 0.008;
      p.y += cos(t * 0.35 + position.x * 3.0) * 0.008;
    }

    vAlpha = 0.5 + 0.5 * sin(t * 1.4 + vPhase);
    gl_PointSize = 1.4 + a * 4.0;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

export const ORB_FRAGMENT = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying float vAlpha;
  varying float vPhase;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float core = smoothstep(0.5, 0.06, d);
    float halo = smoothstep(0.5, 0.22, d) * 0.35;
    vec3 color = mix(uColorB, uColorA, 0.5 + 0.5 * sin(vPhase));
    float alpha = (core + halo) * vAlpha;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(color, alpha);
  }
`
