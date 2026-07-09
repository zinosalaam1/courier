/**
 * Every building in this list shares the same kit convention confirmed by
 * inspecting the raw GLBs: a 2x2 unit footprint and a pivot whose base sits
 * at local y = -1 (so yOffset = scale * 1 raises the base back to y = 0,
 * whatever scale is chosen). Collision only ever checks x/z overlap (see
 * Player.tsx's collidesBuilding - height was never part of that check, even
 * with the old procedural buildings), so buildingHalfFootprint = scale * 1
 * is all City.tsx needs to build an accurate collision box directly from
 * placement data, without waiting on the model to actually finish loading.
 */
export interface BuildingModelDef {
  url: string;
  category: "standard" | "skyscraper" | "low-detail";
}

export const BUILDING_MODELS: BuildingModelDef[] = [
  { url: "/models/buildings/building-a.glb", category: "standard" },
  { url: "/models/buildings/building-b.glb", category: "standard" },
  { url: "/models/buildings/building-c.glb", category: "standard" },
  { url: "/models/buildings/building-d.glb", category: "standard" },
  { url: "/models/buildings/building-e.glb", category: "standard" },
  { url: "/models/buildings/building-f.glb", category: "standard" },
  { url: "/models/buildings/building-g.glb", category: "standard" },
  { url: "/models/buildings/building-h.glb", category: "standard" },
  { url: "/models/buildings/building-skyscraper-a.glb", category: "skyscraper" },
  { url: "/models/buildings/building-skyscraper-b.glb", category: "skyscraper" },
  { url: "/models/buildings/building-skyscraper-c.glb", category: "skyscraper" },
  { url: "/models/buildings/building-skyscraper-d.glb", category: "skyscraper" },
  { url: "/models/buildings/building-skyscraper-e.glb", category: "skyscraper" },
  { url: "/models/buildings/low-detail-building-a.glb", category: "low-detail" },
  { url: "/models/buildings/low-detail-building-b.glb", category: "low-detail" },
  { url: "/models/buildings/low-detail-building-c.glb", category: "low-detail" },
];

export const FOOTPRINT_HALF_WIDTH_AT_SCALE_1 = 1.0;

export function scaleRangeFor(category: BuildingModelDef["category"]): [number, number] {
  if (category === "skyscraper") return [4.5, 6.5];
  return [3.0, 4.0]; // standard + low-detail
}
