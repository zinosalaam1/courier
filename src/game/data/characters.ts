/**
 * Only one real rigged/animated humanoid model is available (RobotExpressive,
 * fetched from threejs.org - the uploaded assets were a car kit and a city
 * kit, no character kit). Rather than pretend there's more variety than
 * there is, or silently reuse the same model under different names, the
 * other options are genuinely different procedural characters (distinct
 * proportions + color scheme, hand-built the same way the offline fallback
 * always worked) - a real, if simpler, alternative rather than a fake one.
 *
 * To add a real second rigged model later: drop a GLB into
 * public/models/characters/ and add an entry here with a `url` - it'll get
 * the same auto-fit-to-height treatment as the robot via
 * boundingBox.ts, and the same Suspense/error-boundary safety net.
 */
export type ProceduralColorScheme = {
  body: string;
  bodyEmissive: string;
  head: string;
  arms: string;
  legs: string;
};

export interface CharacterDef {
  id: string;
  name: string;
  description: string;
  url: string | null; // null = procedural
  colorScheme?: ProceduralColorScheme; // only used when url is null
  previewColor: string; // for the selection screen's card accent
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "robot",
    name: "Unit 7",
    description: "A decommissioned delivery robot, repurposed by Courier Zero. Fully animated.",
    url: "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb",
    previewColor: "#c8f135",
  },
  {
    id: "courier-green",
    name: "Nightrunner",
    description: "Standard-issue courier gear. Acid green, hard to miss.",
    url: null,
    colorScheme: { body: "#c8f135", bodyEmissive: "#1a2000", head: "#1c2430", arms: "#2a3140", legs: "#11151c" },
    previewColor: "#c8f135",
  },
  {
    id: "courier-red",
    name: "Redline",
    description: "Off-book gear, stripped of company colors. Favored by veteran couriers.",
    url: null,
    colorScheme: { body: "#ff3b3b", bodyEmissive: "#2a0000", head: "#1c1414", arms: "#3a1a1a", legs: "#150c0c" },
    previewColor: "#ff3b3b",
  },
  {
    id: "courier-blue",
    name: "Glacier",
    description: "Cold-weather courier rig. Popular during Heavy Rain season.",
    url: null,
    colorScheme: { body: "#60a5fa", bodyEmissive: "#001a2a", head: "#141c24", arms: "#1a2a3a", legs: "#0c1418" },
    previewColor: "#60a5fa",
  },
];

export const DEFAULT_CHARACTER_ID = "courier-green";
