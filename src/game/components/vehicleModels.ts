/**
 * Maps each of the 8 vehicle types to a real GLB model where the kit has a
 * genuine thematic match, and to `null` where it doesn't - the Kenney car
 * kit is cars/trucks/karts, so bicycle, grappling suit, drone, teleport
 * boots, and magnetic skateboard don't have an honest match in it. Those
 * stay character-only (no vehicle mesh) rather than wrapping, say, a sedan
 * around a "bicycle" selection because it happened to be in the folder.
 *
 * yOffset values are real measured data (each model's minY from its actual
 * POSITION accessor bounds, scaled), not a guessed uniform constant - an
 * earlier pass wrongly assumed every model in this kit sits at local y=-1;
 * only "delivery" actually does. race/race-future sit at -0.3, kart-oobi at
 * -0.21. Using the wrong value per-model would either float or sink each
 * vehicle depending on which one it was.
 */
export interface VehicleModelConfig {
  url: string | null;
  scale: number;
  minY: number; // native (scale=1) lowest point - yOffset applied at render time is minY * -scale
}

export const VEHICLE_MODELS: Record<string, VehicleModelConfig> = {
  bicycle: { url: "/models/vehicles/kart-oobi.glb", scale: 1.3, minY: -0.2098 },
  moto: { url: "/models/vehicles/race.glb", scale: 1.7, minY: -0.3 },
  van: { url: "/models/vehicles/delivery.glb", scale: 1.0, minY: -1.0 },
  hover: { url: "/models/vehicles/race-future.glb", scale: 1.7, minY: -0.3 },
  grapple: { url: null, scale: 1, minY: 0 },
  drone: { url: null, scale: 1, minY: 0 },
  teleport: { url: null, scale: 1, minY: 0 },
  skateboard: { url: null, scale: 1, minY: 0 },
};
