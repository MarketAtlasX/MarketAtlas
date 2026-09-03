/**
 * Celestial Outer Space System
 *
 * Populates the outer space surrounding the 3D globe with:
 * - 6,000+ deep space stars with astrophysical spectral colors (O, B, A, G, K, M)
 * - The Milky Way galactic plane with dense star lanes and interstellar dust clouds
 * - Deep-space cosmic nebulae (ultraviolet indigo, ionized cyan, stellar magenta)
 * - Distant spiral galaxy cluster
 * - Procedural star sprites with soft glow halos (no external assets required)
 * - Subtle celestial drift and stellar scintillation
 */

import * as THREE from 'three'

export interface CelestialSpaceHandle {
  group: THREE.Group
  update: (delta: number) => void
  dispose: () => void
}

/** Generate a circular star point texture with an exponential halo */
function createStarTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    gradient.addColorStop(0.12, 'rgba(235, 245, 255, 0.85)')
    gradient.addColorStop(0.35, 'rgba(160, 210, 255, 0.35)')
    gradient.addColorStop(0.70, 'rgba(90, 140, 255, 0.08)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/** Generate a soft volumetric cosmic nebula cloud texture */
function createNebulaTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)')
    gradient.addColorStop(0.25, 'rgba(200, 180, 255, 0.25)')
    gradient.addColorStop(0.55, 'rgba(90, 140, 230, 0.12)')
    gradient.addColorStop(0.85, 'rgba(40, 70, 160, 0.03)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function createCelestialSpace(scene: THREE.Scene): CelestialSpaceHandle {
  const celestialGroup = new THREE.Group()
  celestialGroup.name = 'celestial-space-system'

  const starTexture = createStarTexture()
  const nebulaTexture = createNebulaTexture()

  // ── 1. Primary Deep Space Starfield (5,000 isotropic stars) ───────────────
  const starCount = 5500
  const starPositions = new Float32Array(starCount * 3)
  const starColors = new Float32Array(starCount * 3)
  const starSizes = new Float32Array(starCount)

  // Real spectral classes: Blue-White, White, Solar Yellow, Orange, Red Giant
  const spectralPalette = [
    new THREE.Color('#bad4ff'), // Class O/B (Blue-White)
    new THREE.Color('#dce7ff'), // Class A (White-Blue)
    new THREE.Color('#ffffff'), // Class A/F (Pure White)
    new THREE.Color('#fff0d4'), // Class G (Solar Warm Yellow)
    new THREE.Color('#ffd199'), // Class K (Orange)
    new THREE.Color('#ff967a'), // Class M (Red Giant)
  ]

  for (let i = 0; i < starCount; i++) {
    const radius = 1400 + Math.random() * 800
    const theta = 2 * Math.PI * Math.random()
    const phi = Math.acos(2 * Math.random() - 1)

    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)

    starPositions[i * 3] = x
    starPositions[i * 3 + 1] = y
    starPositions[i * 3 + 2] = z

    const colorChoice = spectralPalette[Math.floor(Math.random() * spectralPalette.length)]
    const brightness = 0.55 + Math.random() * 0.45
    starColors[i * 3] = colorChoice.r * brightness
    starColors[i * 3 + 1] = colorChoice.g * brightness
    starColors[i * 3 + 2] = colorChoice.b * brightness

    starSizes[i] = Math.random() < 0.05 ? 3.4 : Math.random() < 0.2 ? 2.2 : 1.4
  }

  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3))

  const starMat = new THREE.PointsMaterial({
    size: 2.2,
    map: starTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const starPoints = new THREE.Points(starGeo, starMat)
  celestialGroup.add(starPoints)

  // ── 2. The Milky Way Galactic Plane (Dense stellar belt) ──────────────────
  const mwCount = 3800
  const mwPositions = new Float32Array(mwCount * 3)
  const mwColors = new Float32Array(mwCount * 3)

  const mwPalette = [
    new THREE.Color('#d0e0ff'),
    new THREE.Color('#ffd8be'),
    new THREE.Color('#c5b2ff'),
    new THREE.Color('#ffffff'),
  ]

  for (let i = 0; i < mwCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = 1450 + (Math.random() - 0.5) * 400
    // Distribute along an inclined plane
    const inclination = 0.62 // ~35 degrees inclination
    const spread = (Math.random() - 0.5) * (Math.random() - 0.5) * 280

    const x = dist * Math.cos(angle)
    const z = dist * Math.sin(angle)
    const y = x * Math.sin(inclination) + spread

    mwPositions[i * 3] = x
    mwPositions[i * 3 + 1] = y
    mwPositions[i * 3 + 2] = z

    const color = mwPalette[Math.floor(Math.random() * mwPalette.length)]
    const intensity = 0.4 + Math.random() * 0.6
    mwColors[i * 3] = color.r * intensity
    mwColors[i * 3 + 1] = color.g * intensity
    mwColors[i * 3 + 2] = color.b * intensity
  }

  const mwGeo = new THREE.BufferGeometry()
  mwGeo.setAttribute('position', new THREE.BufferAttribute(mwPositions, 3))
  mwGeo.setAttribute('color', new THREE.BufferAttribute(mwColors, 3))

  const mwMat = new THREE.PointsMaterial({
    size: 1.8,
    map: starTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const mwPoints = new THREE.Points(mwGeo, mwMat)
  celestialGroup.add(mwPoints)

  // ── 3. Cosmic Nebulae (Volumetric glowing gas clouds) ─────────────────────
  const nebCount = 280
  const nebPositions = new Float32Array(nebCount * 3)
  const nebColors = new Float32Array(nebCount * 3)

  const nebPalette = [
    new THREE.Color('#4d269e'), // Deep Cosmic Purple
    new THREE.Color('#1f7ab2'), // Ionized Cyan
    new THREE.Color('#8a2be2'), // Stellar Violet
    new THREE.Color('#b03060'), // Dust Magenta
  ]

  for (let i = 0; i < nebCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = 1500 + (Math.random() - 0.5) * 300
    const inclination = 0.62
    const spread = (Math.random() - 0.5) * 340

    const x = dist * Math.cos(angle)
    const z = dist * Math.sin(angle)
    const y = x * Math.sin(inclination) + spread

    nebPositions[i * 3] = x
    nebPositions[i * 3 + 1] = y
    nebPositions[i * 3 + 2] = z

    const c = nebPalette[Math.floor(Math.random() * nebPalette.length)]
    nebColors[i * 3] = c.r
    nebColors[i * 3 + 1] = c.g
    nebColors[i * 3 + 2] = c.b
  }

  const nebGeo = new THREE.BufferGeometry()
  nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPositions, 3))
  nebGeo.setAttribute('color', new THREE.BufferAttribute(nebColors, 3))

  const nebMat = new THREE.PointsMaterial({
    size: 78,
    map: nebulaTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const nebPoints = new THREE.Points(nebGeo, nebMat)
  celestialGroup.add(nebPoints)

  // ── 4. Distant Spiral Galaxy (Andromeda cluster) ──────────────────────────
  const galaxyCount = 900
  const galaxyPositions = new Float32Array(galaxyCount * 3)
  const galaxyColors = new Float32Array(galaxyCount * 3)

  // Position galaxy cluster in deep space quadrant
  const gCenter = new THREE.Vector3(1200, 700, -1100).normalize().multiplyScalar(1700)
  const gColorCore = new THREE.Color('#fff2cc')
  const gColorArm = new THREE.Color('#78b4ff')

  for (let i = 0; i < galaxyCount; i++) {
    const armAngle = (i % 2 === 0 ? 0 : Math.PI) + Math.sqrt(i) * 0.35
    const r = Math.pow(Math.random(), 1.6) * 160
    const x = gCenter.x + Math.cos(armAngle) * r + (Math.random() - 0.5) * 20
    const y = gCenter.y + (Math.random() - 0.5) * 28
    const z = gCenter.z + Math.sin(armAngle) * r + (Math.random() - 0.5) * 20

    galaxyPositions[i * 3] = x
    galaxyPositions[i * 3 + 1] = y
    galaxyPositions[i * 3 + 2] = z

    const ratio = r / 160
    const color = gColorCore.clone().lerp(gColorArm, ratio)
    galaxyColors[i * 3] = color.r
    galaxyColors[i * 3 + 1] = color.g
    galaxyColors[i * 3 + 2] = color.b
  }

  const galaxyGeo = new THREE.BufferGeometry()
  galaxyGeo.setAttribute('position', new THREE.BufferAttribute(galaxyPositions, 3))
  galaxyGeo.setAttribute('color', new THREE.BufferAttribute(galaxyColors, 3))

  const galaxyMat = new THREE.PointsMaterial({
    size: 2.8,
    map: starTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const galaxyPoints = new THREE.Points(galaxyGeo, galaxyMat)
  celestialGroup.add(galaxyPoints)

  scene.add(celestialGroup)

  return {
    group: celestialGroup,
    update: (time: number) => {
      // Very subtle celestial rotation mimicking the cosmic sphere
      celestialGroup.rotation.y = time * 0.00003
      celestialGroup.rotation.x = Math.sin(time * 0.00002) * 0.02
    },
    dispose: () => {
      scene.remove(celestialGroup)
      starGeo.dispose()
      starMat.dispose()
      mwGeo.dispose()
      mwMat.dispose()
      nebGeo.dispose()
      nebMat.dispose()
      galaxyGeo.dispose()
      galaxyMat.dispose()
      starTexture.dispose()
      nebulaTexture.dispose()
    },
  }
}
