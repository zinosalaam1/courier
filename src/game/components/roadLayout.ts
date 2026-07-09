export interface RoadSegment {
  x: number; z: number;       // center point
  length: number; width: number;
  axis: "ns" | "ew";          // north-south (runs along Z) or east-west (runs along X)
}

export interface Intersection { x: number; z: number; size: number; }

// One main delivery route (start -> destination, runs the length of the map)
// plus three cross streets. Purely cosmetic - the player was never actually
// blocked off-road (only buildings block movement), so this doesn't touch
// physics/collision, just gives the city actual streets to look at and drive
// along instead of an undifferentiated flat plane with grid lines on it.
export const ROAD_SEGMENTS: RoadSegment[] = [
  { x: 0, z: -3, length: 150, width: 11, axis: "ns" },  // main route, start -> destination
  { x: 0, z: -40, length: 150, width: 9, axis: "ew" },
  { x: 0, z: 0, length: 150, width: 9, axis: "ew" },
  { x: 0, z: 40, length: 150, width: 9, axis: "ew" },
];

export const INTERSECTIONS: Intersection[] = [
  { x: 0, z: -40, size: 12 },
  { x: 0, z: 0, size: 12 },
  { x: 0, z: 40, size: 12 },
];
