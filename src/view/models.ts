/**
 * Space Typing's model library, read through the URL contract
 * /assets/space-typing/models/ (the Vite plugin in dev, an nginx alias in
 * play; parent repo docs/games/SPLIT_PLAN.md §5). Never copied here.
 */
import { ModelLibrary, SPACE_MODEL_MANIFEST_URL } from "../kit/three";

export const models = new ModelLibrary({ manifests: SPACE_MODEL_MANIFEST_URL });
