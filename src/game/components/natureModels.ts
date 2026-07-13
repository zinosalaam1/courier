export interface TreeModelDef {
  url: string;
  minY: number;
  nativeHeight: number;
}

// All 5 share the same minY convention (measured from the real GLTF POSITION bounds).
export const TREE_MODELS: TreeModelDef[] = [
  { url: "/models/nature/CommonTree_1.gltf", minY: -0.243, nativeHeight: 7.26 },
  { url: "/models/nature/CommonTree_2.gltf", minY: -0.243, nativeHeight: 7.64 },
  { url: "/models/nature/CommonTree_3.gltf", minY: -0.243, nativeHeight: 9.43 },
  { url: "/models/nature/CommonTree_4.gltf", minY: -0.243, nativeHeight: 9.44 },
  { url: "/models/nature/CommonTree_5.gltf", minY: -0.243, nativeHeight: 7.01 },
];

// Scale chosen so trees land around 4.5-6 world units tall - taller than the
// 1.8-unit character (they're trees), shorter than the buildings around them.
export const TREE_SCALE_RANGE: [number, number] = [0.55, 0.75];
