/**
 * Maps each of the 8 vehicle types to a real GLB model where the kit has a
 * genuine thematic match, and to `null` where it doesn't - the Kenney car
 * kit is cars/trucks/karts, so bicycle, grappling suit, drone, teleport
 * boots, and magnetic skateboard don't have an honest match in it. Those
 * stay character-only (no vehicle mesh) rather than wrapping, say, a sedan
 * around a "bicycle" selection because it happened to be in the folder.
 *
 * yOffset accounts for this kit's consistent pivot convention (base sits at
 * local y = -1 across every sampled model) combined with each model's scale.
 */
export interface VehicleModelConfig {
  url: string | null;
  scale: number;
  yOffset: number;
}

export const VEHICLE_MODELS: Record<string, VehicleModelConfig> = {
  bicycle: { url: "/models/vehicles/kart-oobi.glb", scale: 0.55, yOffset: 0.55 },
  moto: { url: "/models/vehicles/race.glb", scale: 0.9, yOffset: 0.9 },
  van: { url: "/models/vehicles/delivery.glb", scale: 1.0, yOffset: 1.0 },
  hover: { url: "/models/vehicles/race-future.glb", scale: 0.9, yOffset: 0.9 },
  grapple: { url: null, scale: 1, yOffset: 0 },
  drone: { url: null, scale: 1, yOffset: 0 },
  teleport: { url: null, scale: 1, yOffset: 0 },
  skateboard: { url: null, scale: 1, yOffset: 0 },
};
