import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

const HolographicShaderMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color('#00d4ff'),
    glowColor: new THREE.Color('#0066ff'),
    fresnelPower: 2.0,
    scanlineIntensity: 0.15,
    gridScale: 8.0,
    noiseSpeed: 0.3,
    noiseIntensity: 0.05,
    glowIntensity: 1.0,
    opacity: 0.95,
    rimPower: 3.0,
    rimIntensity: 1.2,
    topColor: new THREE.Color('#0044ff'),
    middleColor: new THREE.Color('#0088ff'),
    bottomColor: new THREE.Color('#00ddff'),
  },
  `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    precision highp float;

    uniform float time;
    uniform vec3 color;
    uniform vec3 glowColor;
    uniform float fresnelPower;
    uniform float scanlineIntensity;
    uniform float gridScale;
    uniform float noiseSpeed;
    uniform float noiseIntensity;
    uniform float glowIntensity;
    uniform float opacity;
    uniform float rimPower;
    uniform float rimIntensity;
    uniform vec3 topColor;
    uniform vec3 middleColor;
    uniform vec3 bottomColor;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
      vec3 normal = normalize(vNormal);

      float fresnel = 1.0 - max(dot(viewDirection, normal), 0.0);
      fresnel = pow(fresnel, fresnelPower);

      vec2 uv = vUv * gridScale;
      vec2 gridUv = fract(uv);
      vec2 gridLine = smoothstep(0.96, 0.98, abs(gridUv - 0.5) * 2.0);
      float grid = max(gridLine.x, gridLine.y);
      grid *= 0.3;

      float scanline = sin(vWorldPosition.y * 40.0 + time * 2.0) * 0.5 + 0.5;
      scanline = pow(scanline, 4.0) * scanlineIntensity;

      float n = fbm(vUv * 3.0 + time * noiseSpeed);
      float noisePattern = (n - 0.5) * noiseIntensity;

      float rim = pow(1.0 - abs(dot(normal, viewDirection)), rimPower);
      rim *= rimIntensity;

      float heightFactor = vNormal.y * 0.5 + 0.5;
      vec3 gradientColor = mix(bottomColor, middleColor, smoothstep(0.0, 0.5, heightFactor));
      gradientColor = mix(gradientColor, topColor, smoothstep(0.5, 1.0, heightFactor));

      vec3 baseColor = gradientColor + noisePattern;
      baseColor += fresnel * glowColor * glowIntensity * 0.8;
      baseColor += rim * color * 0.6;
      baseColor += grid * color * 0.5;
      baseColor += scanline * color;

      float alpha = 0.6 + fresnel * 0.4;
      alpha *= opacity;
      alpha += rim * 0.3;

      gl_FragColor = vec4(baseColor, alpha);
    }
  `,
)

export { HolographicShaderMaterial }
