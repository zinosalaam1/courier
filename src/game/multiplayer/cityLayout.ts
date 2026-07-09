/**
 * Deterministic city layout generator.
 *
 * KNOWN GAP: buildings generated here don't currently avoid the fixed road
 * corridors defined in the client's src/game/components/roadLayout.ts (that
 * file is solo/multiplayer-client-only - roads are purely visual, not part
 * of collision or the server-authoritative simulation, so this file was
 * intentionally kept free of that dependency). Solo mode's City.tsx applies
 * its own road-avoidance nudge on top of its independent building placement;
 * Chaos Mode's buildings, generated here, may occasionally overlap a road
 * visually. Fix: port the same avoidance check into this function using the
 * same fixed road positions, applied identically in both copies of this file.
 *
 * The solo-mode client (src/game/components/City.tsx) uses Math.random() to
 * scatter buildings - fine for a single player where nobody needs to agree on
 * geometry. Multiplayer breaks that assumption: every client AND the
 * authoritative server must compute the exact same building positions from
 * the exact same seed, or "the server said you hit a wall" and "the client
 * rendered no wall there" disagree and the game feels broken/unfair.
 *
 * This file must stay byte-identical between:
 *   - server/src/shared/cityLayout.ts   (this file)
 *   - client's src/game/multiplayer/cityLayout.ts (same content)
 * It has zero framework dependencies (no THREE, no Colyseus) specifically so
 * it can be dropped into either project unmodified.
 */

// Mulberry32 - small, fast, deterministic PRNG. Same seed -> same sequence,
// forever, on any JS engine. (Math.random() gives no such guarantee.)
export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface BuildingLayout {
  x: number; z: number; y: number; // center position (y = height/2)
  width: number; height: number; depth: number;
  rotationY: number;
  shape: "box" | "cylinder" | "cone";
  isSignHost: boolean;
}

export interface CityLayout {
  seed: number;
  citySize: number;
  buildings: BuildingLayout[];
  heatZones: { x: number; z: number; radius: number }[];
  jumpPadPosition: { x: number; z: number };
  teleporters: [{ x: number; z: number }, { x: number; z: number }];
  startPosition: { x: number; z: number };
  destinationPosition: { x: number; z: number };
  waterZ: number;
}

/** Pure function: same seed and heatMult in -> same layout out, always. */
export function generateCityLayout(seed: number, heatMult = 1): CityLayout {
  const rand = mulberry32(seed);
  const citySize = 160;
  const buildings: BuildingLayout[] = [];

  for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 2;
    const radius = 28 + (i % 3) * 18;
    const w = 6 + rand() * 6, d = 6 + rand() * 6, h = 10 + rand() * 30;
    const shapeRoll = rand();
    const shape: BuildingLayout["shape"] = shapeRoll < 0.55 ? "box" : shapeRoll < 0.8 ? "cylinder" : "cone";
    buildings.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      y: h / 2,
      width: w, height: h, depth: d,
      rotationY: rand() * Math.PI,
      shape,
      isSignHost: i % 5 === 0,
    });
  }

  return {
    seed,
    citySize,
    buildings,
    heatZones: [0, 1].map((i) => ({ x: -20 + i * 40, z: -20, radius: 3.5 * heatMult })),
    jumpPadPosition: { x: 10, z: -5 },
    teleporters: [{ x: -15, z: 15 }, { x: 15, z: -35 }],
    startPosition: { x: 0, z: -60 },
    destinationPosition: { x: 0, z: 55 },
    waterZ: 25,
  };
}

/** Axis-aligned bounding box collision check against the generated layout -
 *  used by both the server's authoritative simulation and (optionally) any
 *  client-side prediction. Matches the padding used in the solo-mode client.
 *  Simplification: treats every building as unrotated for collision purposes
 *  (uses width/depth directly, ignores rotationY). The solo client's version
 *  computed a real rotated bounding box via THREE.Box3.setFromObject, which
 *  is slightly more accurate but needs a 3D math library. This approximation
 *  is close enough to feel fair and is trivial to port to any language/engine
 *  for the server - upgrade to real OBB collision if it ever feels wrong. */
export function collidesBuilding(x: number, z: number, layout: CityLayout): boolean {
  for (const b of layout.buildings) {
    const halfW = b.width / 2 + 0.8, halfD = b.depth / 2 + 0.8;
    if (x > b.x - halfW && x < b.x + halfW && z > b.z - halfD && z < b.z + halfD) return true;
  }
  return false;
}
