import * as THREE from "three";

/**
 * Computes a bounding box from each mesh's raw geometry.boundingBox (bind-
 * pose / rest-pose vertex data) transformed only by the mesh's own node
 * transform (matrixWorld) - deliberately NOT via THREE.Box3().setFromObject,
 * which samples getWorldPosition() per vertex. For a SkinnedMesh, that
 * includes the current skinning deformation, which depends on the
 * skeleton's bone matrices being up to date - unreliable immediately after
 * load, before any animation frame has run, and the reason an earlier pass
 * of this file used a wrong fixed scale instead of measuring at all.
 *
 * geometry.boundingBox is the raw position-attribute bounds and is never
 * affected by skinning (skinning is a separate transform applied at render
 * time, not baked into the stored attribute), so this is safe to call the
 * instant a model finishes loading.
 */
export function computeBindPoseBoundingBox(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  let hasAny = false;
  root.updateWorldMatrix(true, true);

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return;

    const localBox = mesh.geometry.boundingBox.clone();
    localBox.applyMatrix4(mesh.matrixWorld);
    if (!hasAny) { box.copy(localBox); hasAny = true; }
    else box.union(localBox);
  });

  return box;
}
