export interface ObstacleModelDef {
  url: string;
  halfX: number;
  halfZ: number;
  minY: number;
  scaleRange: [number, number];
}

export const OBSTACLE_MODELS: ObstacleModelDef[] = [
  { url: "/models/obstacles/cone.glb", halfX: 0.238, halfZ: 0.238, minY: 0, scaleRange: [1.6, 2.4] },
  { url: "/models/obstacles/debris-tire.glb", halfX: 0.175, halfZ: 0.3, minY: -0.3, scaleRange: [1.6, 2.2] },
];
