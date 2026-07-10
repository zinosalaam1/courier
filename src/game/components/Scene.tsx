import { memo, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { City } from "./City";
import { Player } from "./Player";
import { HazardCars, type HazardCarsHandle } from "./HazardCars";
import { GadgetEffects, type GadgetEffectsHandle } from "./GadgetEffects";
import { EventsController } from "./EventsController";
import { Rain } from "./Rain";
import { makeSkyTexture } from "./textures";
import { createWorldRefs, type WorldRefs } from "./worldRefs";
import { generateSoloCityLayout, type SoloCityLayout } from "./cityGenerator";
import type { VehicleDef, WeeklyThemeDef } from "../data/gameData";

interface SceneProps {
  vehicle: VehicleDef;
  theme: WeeklyThemeDef | null;
}

/** Builds a fresh world + city layout together, in one place, and applies
 *  the layout's start/destination/heat-zone/etc. positions to `world`
 *  immediately - all synchronously, during Scene's own render, before any
 *  child component (Player, City) mounts. This matters: Player reads
 *  world.startPosition once, in a useRef initializer, the moment it mounts.
 *  If that mutation happened later (e.g. in a useEffect inside City, a
 *  sibling component), Player could easily read the OLD default position
 *  depending on render/effect ordering - a real, easy-to-hit race condition
 *  for exactly this kind of "parent creates shared mutable state, siblings
 *  both depend on it" pattern. Computing it once, here, before either child
 *  exists, avoids the race entirely rather than hoping for lucky ordering. */
function useMissionWorld(theme: WeeklyThemeDef | null): { world: WorldRefs; layout: SoloCityLayout } {
  return useMemo(() => {
    const world = createWorldRefs();
    const layout = generateSoloCityLayout();
    const heatMult = theme?.mods.heatMult ?? 1;

    world.citySize = layout.citySize;
    world.startPosition.set(layout.startPosition.x, 0, layout.startPosition.z);
    world.destinationPosition.set(layout.destinationPosition.x, 0, layout.destinationPosition.z);
    world.heatZones = layout.heatZones.map((h) => ({ position: new THREE.Vector3(h.x, 0, h.z), radius: h.radius * heatMult }));
    world.jumpPadPosition.set(layout.jumpPadPosition.x, 0.05, layout.jumpPadPosition.z);
    world.teleporters = [
      new THREE.Vector3(layout.teleporters[0].x, 0.5, layout.teleporters[0].z),
      new THREE.Vector3(layout.teleporters[1].x, 0.5, layout.teleporters[1].z),
    ];
    world.waterZ = layout.waterZ;

    window.__tourArcadeWorldMeta = {
      citySize: world.citySize,
      start: { x: world.startPosition.x, z: world.startPosition.z },
      destination: { x: world.destinationPosition.x, z: world.destinationPosition.z },
    };

    // Collision boxes for every building AND obstacle, computed directly from
    // real measured per-model half-extents (see buildingModels.ts /
    // obstacleModels.ts) - available immediately, no waiting on any GLTF to
    // actually finish loading.
    world.buildings = [
      ...layout.buildings.map((b) => {
        const rotatedOdd = Math.abs(Math.round(b.rotationY / (Math.PI / 2))) % 2 === 1;
        const halfX = (rotatedOdd ? b.model.halfZ : b.model.halfX) * b.scale;
        const halfZ = (rotatedOdd ? b.model.halfX : b.model.halfZ) * b.scale;
        return {
          box: new THREE.Box3(
            new THREE.Vector3(b.position[0] - halfX, 0, b.position[1] - halfZ),
            new THREE.Vector3(b.position[0] + halfX, 100, b.position[1] + halfZ)
          ),
        };
      }),
      ...layout.obstacles.map((o) => {
        const halfX = o.model.halfX * o.scale, halfZ = o.model.halfZ * o.scale;
        return {
          box: new THREE.Box3(
            new THREE.Vector3(o.position[0] - halfX, 0, o.position[1] - halfZ),
            new THREE.Vector3(o.position[0] + halfX, 10, o.position[1] + halfZ)
          ),
        };
      }),
    ];

    return { world, layout };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // deliberately once per Scene mount (a fresh mission) - theme read at creation time only
}

/** Renders once per mission (key={missionId} from the parent) so world refs and
 *  player physics state are always fresh for a new contract. */
export const Scene = memo(function Scene({ vehicle, theme }: SceneProps) {
  const { world, layout } = useMissionWorld(theme);
  const hazardCarsRef = useRef<HazardCarsHandle>(null);
  const gadgetEffectsRef = useRef<GadgetEffectsHandle>(null);

  // IMPORTANT: this object must not be a fresh literal on every render. R3F's
  // <Canvas camera={...}> prop is watched for changes and re-applied whenever
  // it changes reference - a new {position:[...]} literal every render means
  // R3F keeps resetting the camera back to this spawn position, fighting the
  // chase-camera logic in Player.tsx and making it look like the camera never
  // follows the player at all (it was being reset ~60x/sec before you'd see
  // it move). Memoizing this, plus wrapping the component itself in
  // React.memo below, fixes both the direct cause and the underlying churn
  // (mission-meter updates in the store re-rendering PlayPage -> Scene every
  // frame even though vehicle/theme never actually change mid-mission).
  // Camera starts near the (now randomized) start position instead of a
  // fixed world-space point that assumed the old single fixed start.
  const cameraConfig = useMemo(
    () => ({
      fov: 58, near: 0.1, far: 1400,
      position: [world.startPosition.x, 4.5, world.startPosition.z - 8] as [number, number, number],
    }),
    [world]
  );

  return (
    <Canvas
      shadows
      camera={cameraConfig}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <SceneContents
        world={world}
        layout={layout}
        vehicle={vehicle}
        theme={theme}
        hazardCarsRef={hazardCarsRef}
        gadgetEffectsRef={gadgetEffectsRef}
      />
    </Canvas>
  );
});

function SceneContents({
  world, layout, vehicle, theme, hazardCarsRef, gadgetEffectsRef,
}: SceneProps & {
  world: WorldRefs;
  layout: SoloCityLayout;
  hazardCarsRef: RefObject<HazardCarsHandle>;
  gadgetEffectsRef: RefObject<GadgetEffectsHandle>;
}) {
  const { scene } = useThree();
  const skyTexture = useMemo(() => makeSkyTexture(), []);

  useMemo(() => {
    scene.fog = new THREE.FogExp2(0x0a0e14, world.fogDensity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useFrame(() => {
    // Blackout event dims these live; kept here (rather than JSX props) since
    // world.blackout can flip mid-mission without a React re-render.
    const sun = scene.getObjectByName("sun-light") as THREE.DirectionalLight | undefined;
    const hemi = scene.getObjectByName("hemi-light") as THREE.HemisphereLight | undefined;
    if (sun) sun.intensity = world.blackout ? 0.06 : 1.1;
    if (hemi) hemi.intensity = world.blackout ? 0.12 : 0.65;
  });

  return (
    <>
      <mesh>
        <sphereGeometry args={[400, 24, 16]} />
        <meshBasicMaterial map={skyTexture} side={THREE.BackSide} fog={false} />
      </mesh>

      <hemisphereLight name="hemi-light" args={[0x2a3550, 0x0a0806, 0.65]} />
      <directionalLight
        name="sun-light"
        position={[world.startPosition.x + 80, 140, world.startPosition.z + 60]}
        intensity={1.1}
        color="#ffd9a0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
        shadow-camera-near={1}
        shadow-camera-far={450}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-60, 40, -80]} intensity={0.35} color="#c8f135" />

      <City world={world} theme={theme} layout={layout} />
      <Player world={world} vehicle={vehicle} gadgetEffectsRef={gadgetEffectsRef} hazardCarsRef={hazardCarsRef} />
      <HazardCars ref={hazardCarsRef} world={world} />
      <GadgetEffects ref={gadgetEffectsRef} world={world} />
      <EventsController world={world} theme={theme} hazardCarsRef={hazardCarsRef} />
      <Rain active={Boolean(theme?.mods.rainVisual)} citySize={world.citySize} />
    </>
  );
}
