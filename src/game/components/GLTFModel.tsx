import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

interface GLTFModelProps {
  url: string;
  scale?: number;
  minY?: number; // native (scale=1) lowest point of the model's real geometry - offset = -minY * scale lands the base at y=0
  rotationY?: number;
}

/**
 * Loads a local, bundled GLTF/GLB (vehicles, buildings - anything in
 * public/models/). Unlike CharacterModel's remote URL, these ship with the
 * app itself, so load failures should be rare (a typo'd path, not a flaky
 * CDN) - but the same Suspense (loading) + real error boundary (failure)
 * split still applies, and failure renders nothing rather than crashing the
 * whole scene.
 */
export function GLTFModel({ url, scale = 1, minY = 0, rotationY = 0 }: GLTFModelProps) {
  return (
    <ModelErrorBoundary>
      <Suspense fallback={null}>
        <LoadedModel url={url} scale={scale} minY={minY} rotationY={rotationY} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

class ModelErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.warn("Model failed to load:", error); }
  render() { return this.state.failed ? null : this.props.children; }
}

function LoadedModel({ url, scale, minY, rotationY }: Required<GLTFModelProps>) {
  const { scene } = useGLTF(url);

  // Clone so multiple instances of the same building/vehicle don't fight
  // over shared transforms/materials (GLTFLoader caches and returns the same
  // scene graph object for repeated useGLTF(url) calls with the same url).
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    cloned.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
    });
  }, [cloned]);

  // Ground alignment: a local point at y=minY needs to land at world y=0
  // after scaling, so the object's own position.y must be -minY * scale.
  return <primitive object={cloned} scale={scale} position={[0, -minY * scale, 0]} rotation={[0, rotationY, 0]} />;
}
