/**
 * Space Typing's model library, read through the URL contract
 * /assets/space-typing/models/ (the Vite plugin in dev, an nginx alias in
 * play; parent repo docs/games/SPLIT_PLAN.md §5). Never copied here.
 */
import * as THREE from "three";
import { ModelLibrary, SPACE_MODEL_MANIFEST_URL, loadModel, pickModelTier, type ModelKind } from "../kit/three";

export const models = new ModelLibrary({ manifests: SPACE_MODEL_MANIFEST_URL });

/** Float copies of the attributes (a meshopt GLB stores them quantized, which a transform would clip). */
export function floatGeometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"] as const) {
    const attribute = source.getAttribute(name);
    if (attribute === undefined) continue;
    const values = new Float32Array(attribute.count * attribute.itemSize);
    for (let i = 0; i < attribute.count; i += 1) {
      values[i * attribute.itemSize] = attribute.getX(i);
      values[i * attribute.itemSize + 1] = attribute.getY(i);
      if (attribute.itemSize > 2) values[i * attribute.itemSize + 2] = attribute.getZ(i);
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize));
  }
  const index = source.getIndex();
  if (index !== null) geometry.setIndex(Array.from(index.array as ArrayLike<number>));
  return geometry;
}

/**
 * The first mesh of the first of `ids` (of `kind`) the library has, baked into
 * world space as floats, with its material cloned; null when none loads (a
 * clean clone has no GLBs): the caller keeps its stand-in.
 */
export async function loadMesh(kind: ModelKind, ids: readonly string[], tier: "high" | "medium" = "high"): Promise<{ geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial } | null> {
  for (const id of ids) {
    const entry = await models.entry(kind, id);
    const url = entry === null ? null : pickModelTier(entry, tier);
    if (url === null) continue;
    try {
      const scene = (await loadModel(url)).scene;
      scene.updateMatrixWorld(true);
      let mesh: THREE.Mesh | null = null;
      scene.traverse((object) => {
        if (mesh === null && (object as THREE.Mesh).isMesh) mesh = object as THREE.Mesh;
      });
      if (mesh === null) continue;
      const found = mesh as THREE.Mesh;
      const geometry = floatGeometry(found.geometry);
      geometry.applyMatrix4(found.matrixWorld);
      const material = (Array.isArray(found.material) ? found.material[0] : found.material) as THREE.MeshStandardMaterial;
      return { geometry, material: material.clone() };
    } catch {
      // A listed model the server does not have: try the next.
    }
  }
  return null;
}
