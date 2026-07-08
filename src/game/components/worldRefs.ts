import * as THREE from "three";

export interface BuildingEntry { box: THREE.Box3; }
export interface HeatZoneEntry { position: THREE.Vector3; radius: number; }
export interface HazardCarEntry {
  mesh: THREE.Object3D;
  direction: THREE.Vector3;
  speed: number;
  disabledUntil: number;
  frozen: boolean;
}

export interface WorldRefs {
  buildings: BuildingEntry[];
  heatZones: HeatZoneEntry[];
  hazardCars: HazardCarEntry[];
  jumpPadPosition: THREE.Vector3;
  teleporters: [THREE.Vector3, THREE.Vector3];
  startPosition: THREE.Vector3;
  destinationPosition: THREE.Vector3;
  waterZ: number;
  waterRaisedY: number;
  waterLoweredY: number;
  waterCurrentY: number;
  citySize: number;

  // Reality-event effect flags - mutated directly by EventsController and read
  // every frame by Player/City/Scene. Kept out of zustand deliberately: these
  // change up to 60x/sec and don't need to trigger React re-renders.
  gravityOverride: number | null;
  reverseControls: boolean;
  timeFrozen: boolean;
  blackout: boolean;
  fogDensity: number;
  quakeUntil: number;
  upsideUntil: number;
  extraJumpPads: THREE.Vector3[];
}

export function createWorldRefs(): WorldRefs {
  return {
    buildings: [],
    heatZones: [],
    hazardCars: [],
    jumpPadPosition: new THREE.Vector3(10, 0.05, -5),
    teleporters: [new THREE.Vector3(-15, 0.5, 15), new THREE.Vector3(15, 0.5, -35)],
    startPosition: new THREE.Vector3(0, 0, -60),
    destinationPosition: new THREE.Vector3(0, 0, 55),
    waterZ: 25,
    waterRaisedY: 0.6,
    waterLoweredY: -3,
    waterCurrentY: -3,
    citySize: 160,
    gravityOverride: null,
    reverseControls: false,
    timeFrozen: false,
    blackout: false,
    fogDensity: 0.011,
    quakeUntil: 0,
    upsideUntil: 0,
    extraJumpPads: [],
  };
}
