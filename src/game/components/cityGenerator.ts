import { BUILDING_MODELS, scaleRangeFor, type BuildingModelDef } from "./buildingModels";
import { OBSTACLE_MODELS, type ObstacleModelDef } from "./obstacleModels";
import type { RoadSegment, Intersection } from "./roadLayout";

export interface PlacedBuilding {
  position: [number, number];
  rotationY: number; // multiple of 90deg - keeps the footprint axis-aligned for accurate collision
  model: BuildingModelDef;
  scale: number;
}

export interface PlacedObstacle {
  position: [number, number];
  model: ObstacleModelDef;
  scale: number;
  rotationY: number;
}

export interface BoundaryWall {
  x: number; z: number; length: number; axis: "ns" | "ew";
}

export interface ParkBlock {
  x: number; z: number; halfX: number; halfZ: number;
  trees: { x: number; z: number; scale: number }[];
}

export interface Crosswalk {
  x: number; z: number; axis: "ns" | "ew";
}

export interface SoloCityLayout {
  citySize: number;
  roadSegments: RoadSegment[];
  intersections: Intersection[];
  crosswalks: Crosswalk[];
  buildings: PlacedBuilding[];
  obstacles: PlacedObstacle[];
  boundaryWalls: BoundaryWall[];
  parks: ParkBlock[];
  lake: { x: number; z: number; radiusX: number; radiusZ: number };
  startPosition: { x: number; z: number };
  destinationPosition: { x: number; z: number };
  heatZones: { x: number; z: number; radius: number }[];
  jumpPadPosition: { x: number; z: number };
  teleporters: [{ x: number; z: number }, { x: number; z: number }];
}

const STREET_COORDS = [-80, -40, 0, 40, 80]; // both axes - a real 4x4 block grid, not one straight road
const ROAD_WIDTH_MAIN = 10;
const ROAD_WIDTH_MINOR = 9;
const CITY_SIZE = 220;

/** Real, non-guessed pure function - solo mode intentionally gets a fresh
 *  layout every mission (uses Math.random()); unlike multiplayer's seeded
 *  determinism, nothing here needs to match a server. */
export function generateSoloCityLayout(): SoloCityLayout {
  const roadSegments: RoadSegment[] = [];
  STREET_COORDS.forEach((x, i) => {
    roadSegments.push({ x, z: 0, length: 190, width: i === 2 ? ROAD_WIDTH_MAIN : ROAD_WIDTH_MINOR, axis: "ns" });
  });
  STREET_COORDS.forEach((z, i) => {
    roadSegments.push({ x: 0, z, length: 190, width: i === 2 ? ROAD_WIDTH_MAIN : ROAD_WIDTH_MINOR, axis: "ew" });
  });
  const intersections: Intersection[] = [];
  for (const x of STREET_COORDS) for (const z of STREET_COORDS) intersections.push({ x, z, size: 13 });
  const crosswalks: Crosswalk[] = intersections.map((it) => ({ x: it.x, z: it.z, axis: "ns" as const }));

  // Perimeter walls - a few units inside the true ground-plane edge, so the
  // playable area is visibly bounded instead of open into empty space.
  const wallHalf = CITY_SIZE / 2 - 6;
  const boundaryWalls: BoundaryWall[] = [
    { x: 0, z: wallHalf, length: wallHalf * 2, axis: "ew" },
    { x: 0, z: -wallHalf, length: wallHalf * 2, axis: "ew" },
    { x: wallHalf, z: 0, length: wallHalf * 2, axis: "ns" },
    { x: -wallHalf, z: 0, length: wallHalf * 2, axis: "ns" },
  ];

  // Start/destination: two distinct grid intersections, far apart on BOTH
  // axes so the route is a real diagonal traverse across blocks rather than
  // a single straight corridor.
  const idxRange = [0, 1, 2, 3, 4];
  let startIdx = [0, 0], destIdx = [0, 0];
  let attempts = 0;
  do {
    startIdx = [idxRange[Math.floor(Math.random() * 5)], idxRange[Math.floor(Math.random() * 5)]];
    destIdx = [idxRange[Math.floor(Math.random() * 5)], idxRange[Math.floor(Math.random() * 5)]];
    attempts++;
  } while (attempts < 30 && (Math.abs(startIdx[0] - destIdx[0]) < 2 || Math.abs(startIdx[1] - destIdx[1]) < 2));

  const startPosition = { x: STREET_COORDS[startIdx[0]], z: STREET_COORDS[startIdx[1]] };
  const destinationPosition = { x: STREET_COORDS[destIdx[0]], z: STREET_COORDS[destIdx[1]] };

  // Buildings: 1-3 per block, placed inside the block interior (inset from
  // the surrounding roads), rejecting placements that would overlap a
  // building already placed in the same block. Two blocks are set aside as
  // a park and a lake instead of getting buildings, so the city isn't wall-
  // to-wall towers.
  const totalBlocks = (STREET_COORDS.length - 1) * (STREET_COORDS.length - 1);
  const blockKey = (bx: number, bz: number) => bx * (STREET_COORDS.length - 1) + bz;
  const specialBlocks = new Set<number>();
  while (specialBlocks.size < 2) specialBlocks.add(Math.floor(Math.random() * totalBlocks));
  const [parkBlockKey, lakeBlockKey] = Array.from(specialBlocks);

  const buildings: PlacedBuilding[] = [];
  const parks: ParkBlock[] = [];
  let lake = { x: 0, z: 0, radiusX: 12, radiusZ: 12 };

  for (let bx = 0; bx < STREET_COORDS.length - 1; bx++) {
    for (let bz = 0; bz < STREET_COORDS.length - 1; bz++) {
      const xMin = STREET_COORDS[bx] + ROAD_WIDTH_MAIN / 2 + 4;
      const xMax = STREET_COORDS[bx + 1] - ROAD_WIDTH_MAIN / 2 - 4;
      const zMin = STREET_COORDS[bz] + ROAD_WIDTH_MAIN / 2 + 4;
      const zMax = STREET_COORDS[bz + 1] - ROAD_WIDTH_MAIN / 2 - 4;
      const cx = (xMin + xMax) / 2, cz = (zMin + zMax) / 2;
      const key = blockKey(bx, bz);

      if (key === lakeBlockKey) {
        lake = { x: cx, z: cz, radiusX: (xMax - xMin) / 2 - 2, radiusZ: (zMax - zMin) / 2 - 2 };
        continue;
      }
      if (key === parkBlockKey) {
        const trees: ParkBlock["trees"] = [];
        const treeCount = 5 + Math.floor(Math.random() * 4);
        for (let t = 0; t < treeCount; t++) {
          trees.push({
            x: xMin + Math.random() * (xMax - xMin),
            z: zMin + Math.random() * (zMax - zMin),
            scale: 1.2 + Math.random() * 0.8,
          });
        }
        parks.push({ x: cx, z: cz, halfX: (xMax - xMin) / 2, halfZ: (zMax - zMin) / 2, trees });
        continue;
      }

      const count = 1 + Math.floor(Math.random() * 3);
      const placedInBlock: { x: number; z: number; half: number }[] = [];

      for (let n = 0; n < count; n++) {
        const modelDef = BUILDING_MODELS[Math.floor(Math.random() * BUILDING_MODELS.length)];
        const [minScale, maxScale] = scaleRangeFor(modelDef.category);
        const scale = minScale + Math.random() * (maxScale - minScale);
        const half = Math.max(modelDef.halfX, modelDef.halfZ) * scale;

        let placed = false;
        for (let tries = 0; tries < 6 && !placed; tries++) {
          const x = xMin + half + Math.random() * Math.max(0.1, xMax - xMin - half * 2);
          const z = zMin + half + Math.random() * Math.max(0.1, zMax - zMin - half * 2);
          const clearOfOthers = placedInBlock.every((p) => Math.hypot(p.x - x, p.z - z) > p.half + half + 2);
          if (clearOfOthers) {
            buildings.push({ position: [x, z], rotationY: Math.floor(Math.random() * 4) * (Math.PI / 2), model: modelDef, scale });
            placedInBlock.push({ x, z, half });
            placed = true;
          }
        }
      }
    }
  }

  // Obstacles: cones/debris scattered near road edges - real physical
  // hazards to steer around, not just decoration.
  const obstacles: PlacedObstacle[] = [];
  for (let i = 0; i < 26; i++) {
    const road = roadSegments[Math.floor(Math.random() * roadSegments.length)];
    const along = (Math.random() - 0.5) * road.length * 0.85;
    const lateral = (road.width / 2 - 1.2) * (Math.random() < 0.5 ? -1 : 1);
    const x = road.axis === "ns" ? road.x + lateral : road.x + along;
    const z = road.axis === "ns" ? road.z + along : road.z + lateral;

    // Keep obstacles off the start/destination markers themselves.
    if (Math.hypot(x - startPosition.x, z - startPosition.z) < 8) continue;
    if (Math.hypot(x - destinationPosition.x, z - destinationPosition.z) < 8) continue;

    const model = OBSTACLE_MODELS[Math.floor(Math.random() * OBSTACLE_MODELS.length)];
    const [minScale, maxScale] = model.scaleRange;
    obstacles.push({ position: [x, z], model, scale: minScale + Math.random() * (maxScale - minScale), rotationY: Math.random() * Math.PI * 2 });
  }

  return {
    citySize: CITY_SIZE,
    roadSegments,
    intersections,
    crosswalks,
    buildings,
    obstacles,
    boundaryWalls,
    parks,
    lake,
    startPosition,
    destinationPosition,
    heatZones: [
      { x: STREET_COORDS[1], z: STREET_COORDS[1], radius: 5 },
      { x: STREET_COORDS[3], z: STREET_COORDS[3], radius: 5 },
    ],
    jumpPadPosition: { x: STREET_COORDS[1], z: STREET_COORDS[3] },
    teleporters: [
      { x: STREET_COORDS[0] + 10, z: STREET_COORDS[1] },
      { x: STREET_COORDS[4] - 10, z: STREET_COORDS[3] },
    ],
  };
}
