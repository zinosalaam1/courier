/**
 * Real measured geometry per model (measured directly from each GLB's
 * POSITION accessor bounds, not guessed). Earlier code assumed a uniform 2x2
 * footprint with base at local y=-1 for every model in this kit - that was
 * wrong on both counts (it came from misreading NORMAL vectors as position
 * data in an earlier measurement pass). Every building's actual base sits at
 * local y=0 already - no vertical offset needed at all, which is exactly why
 * buildings were floating: the code was lifting them up by their own scale
 * value for no reason. Footprints also vary per model rather than being
 * uniform, so collision boxes now use each model's real measured size.
 */
export interface BuildingModelDef {
  url: string;
  category: "standard" | "skyscraper" | "low-detail";
  halfX: number;   // native (scale=1) half-width along local X
  halfZ: number;   // native (scale=1) half-depth along local Z
  height: number;  // native (scale=1) height, base-to-top
}

export const BUILDING_MODELS: BuildingModelDef[] = [
  { url: "/models/buildings/building-a.glb", category: "standard", halfX: 0.442, halfZ: 0.470, height: 1.293 },
  { url: "/models/buildings/building-b.glb", category: "standard", halfX: 0.485, halfZ: 0.470, height: 1.293 },
  { url: "/models/buildings/building-c.glb", category: "standard", halfX: 0.442, halfZ: 0.545, height: 0.893 },
  { url: "/models/buildings/building-d.glb", category: "standard", halfX: 0.420, halfZ: 0.450, height: 1.293 },
  { url: "/models/buildings/building-e.glb", category: "standard", halfX: 0.820, halfZ: 0.504, height: 0.893 },
  { url: "/models/buildings/building-f.glb", category: "standard", halfX: 0.420, halfZ: 0.515, height: 1.693 },
  { url: "/models/buildings/building-g.glb", category: "standard", halfX: 0.485, halfZ: 0.461, height: 1.693 },
  { url: "/models/buildings/building-h.glb", category: "standard", halfX: 0.442, halfZ: 0.504, height: 1.293 },
  { url: "/models/buildings/building-skyscraper-a.glb", category: "skyscraper", halfX: 0.680, halfZ: 0.680, height: 2.880 },
  { url: "/models/buildings/building-skyscraper-b.glb", category: "skyscraper", halfX: 0.680, halfZ: 0.680, height: 4.480 },
  { url: "/models/buildings/building-skyscraper-c.glb", category: "skyscraper", halfX: 0.640, halfZ: 0.694, height: 4.080 },
  { url: "/models/buildings/building-skyscraper-d.glb", category: "skyscraper", halfX: 0.640, halfZ: 0.694, height: 5.470 },
  { url: "/models/buildings/building-skyscraper-e.glb", category: "skyscraper", halfX: 0.647, halfZ: 0.621, height: 4.080 },
  { url: "/models/buildings/low-detail-building-a.glb", category: "low-detail", halfX: 0.25, halfZ: 0.25, height: 2.000 },
  { url: "/models/buildings/low-detail-building-b.glb", category: "low-detail", halfX: 0.25, halfZ: 0.25, height: 2.225 },
  { url: "/models/buildings/low-detail-building-c.glb", category: "low-detail", halfX: 0.25, halfZ: 0.25, height: 2.250 },
];

export function scaleRangeFor(category: BuildingModelDef["category"]): [number, number] {
  if (category === "skyscraper") return [5, 7];
  if (category === "low-detail") return [7, 10]; // small native footprint (0.25 half-width) - needs more scale to read as a real building rather than a shed
  return [7, 10];
}
