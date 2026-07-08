// Single source of truth for everything the landing page describes and the game
// implements. Typed so the contract board, HUD, and mission logic all share exactly
// the same shape - no drift between "what the site says" and "what the game does."

export type ThreatLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "???";

export interface PackageDef {
  id: string;
  name: string;
  rule: string;
  color: string;
  icon: string;
  threat: ThreatLevel;
  fallLimit?: number;       // Fragile: impact speed above which it breaks
  heatTolerance?: number;   // Frozen: max heat before spoiling
  radiationCap?: number;    // Radioactive: max radiation before containment fails
  damageCap?: number;       // Unstable: max damage before it's destroyed (100 = full)
  speedMult?: number;       // Heavy: movement speed multiplier
  timeLimit?: number;       // Time-Locked: seconds allowed
}

export const PACKAGES: PackageDef[] = [
  { id: "standard", name: "Standard", rule: "Simply reach the destination.", color: "#7a8694", icon: "▣", threat: "LOW" },
  { id: "fragile", name: "Fragile", rule: "Jump too high. Break it. Mission failed.", color: "#60a5fa", icon: "◇", threat: "MEDIUM", fallLimit: 6.0 },
  { id: "frozen", name: "Frozen", rule: "Stay near heat too long. Delivery fails.", color: "#67e8f9", icon: "❄", threat: "MEDIUM", heatTolerance: 100 },
  { id: "radioactive", name: "Radioactive", rule: "Standing still increases radiation. Keep moving.", color: "#c8f135", icon: "☢", threat: "HIGH", radiationCap: 100 },
  { id: "unstable", name: "Unstable", rule: "Every collision damages it.", color: "#f97316", icon: "☠", threat: "HIGH", damageCap: 100 },
  { id: "heavy", name: "Heavy", rule: "Movement becomes significantly slower.", color: "#a78bfa", icon: "▼", threat: "MEDIUM", speedMult: 0.6 },
  { id: "time", name: "Time-Locked", rule: "Must arrive within five minutes. No exceptions.", color: "#ff3b3b", icon: "⏱", threat: "CRITICAL", timeLimit: 300 },
  { id: "unknown", name: "Unknown", rule: "Rules are revealed only halfway through the mission.", color: "#fbbf24", icon: "?", threat: "???" },
];

export interface VehicleDef {
  id: string;
  tier: string;
  name: string;
  stats: string;
  speed: number;
  accel: number;
  turn: number;
  jump: number;
  water: boolean;
  fly: boolean;
  armored?: boolean;
  fuel?: number;
  teleportCharges?: number;
  reputationRequired: number;
}

export const VEHICLES: VehicleDef[] = [
  { id: "bicycle", tier: "01", name: "Bicycle", stats: "Fast · Cheap · Exposed", speed: 9, accel: 14, turn: 2.6, jump: 5.2, water: false, fly: false, reputationRequired: 0 },
  { id: "moto", tier: "02", name: "Motorcycle", stats: "Speed · Balance · Urban agility", speed: 15, accel: 20, turn: 3.4, jump: 5.0, water: false, fly: false, reputationRequired: 30 },
  { id: "van", tier: "03", name: "Delivery Van", stats: "High capacity · Slow · Armored", speed: 7, accel: 8, turn: 1.6, jump: 4.0, water: false, fly: false, armored: true, reputationRequired: 60 },
  { id: "hover", tier: "04", name: "Hover Bike", stats: "Water crossing · Elevated routes", speed: 12, accel: 16, turn: 3.0, jump: 5.4, water: true, fly: false, reputationRequired: 90 },
  { id: "grapple", tier: "05", name: "Grappling Suit", stats: "Rooftop traversal · Vertical", speed: 8, accel: 12, turn: 3.2, jump: 9.5, water: false, fly: false, reputationRequired: 120 },
  { id: "drone", tier: "06", name: "Drone Delivery", stats: "Air superiority · Time-limited", speed: 11, accel: 18, turn: 3.6, jump: 0, water: true, fly: true, fuel: 40, reputationRequired: 150 },
  { id: "teleport", tier: "07", name: "Teleport Boots", stats: "Instant skip · Very limited uses", speed: 9, accel: 22, turn: 3.4, jump: 5.2, water: false, fly: false, teleportCharges: 3, reputationRequired: 200 },
  { id: "skateboard", tier: "08", name: "Magnetic Skateboard", stats: "Wall riding · Extreme precision", speed: 13, accel: 19, turn: 3.8, jump: 6.0, water: false, fly: false, reputationRequired: 260 },
];

export interface GadgetDef {
  id: string;
  name: string;
  desc: string;
  detail: string;
  key: string;
}

export const GADGETS: GadgetDef[] = [
  { id: "emp", name: "EMP Device", desc: "Disables electronic obstacles", detail: "Disables the nearest active obstacle for 6s.", key: "1" },
  { id: "bridge", name: "Portable Bridge", desc: "Create your own shortcut", detail: "Drops a temporary bridge plank in front of you.", key: "2" },
  { id: "fakegps", name: "Fake GPS", desc: "Confuses rival couriers", detail: "Broadcasts a decoy position to other players.", key: "3" },
  { id: "smoke", name: "Smoke Device", desc: "Hide from surveillance drones", detail: "Hides you from the minimap & rivals for 8s.", key: "4" },
  { id: "repair", name: "Repair Kit", desc: "Fix a damaged package mid-route", detail: "Restores 40 pts of package integrity/heat/radiation.", key: "5" },
  { id: "jumppad", name: "Jump Pads", desc: "Launch across impossible gaps", detail: "Drops an instant jump pad beneath you.", key: "6" },
];

export type RealityEventId =
  | "gravity" | "upside" | "teleport" | "reverse" | "traffic"
  | "blackout" | "fog" | "flood" | "quake" | "freeze";

export interface RealityEventDef {
  id: RealityEventId;
  name: string;
  desc: string;
  glyph: string;
  durationMs: number;
}

export const REALITY_EVENTS: RealityEventDef[] = [
  { id: "gravity", name: "Gravity Shift", desc: "Gravity drops sharply. Jumps go long and slow.", glyph: "↕", durationMs: 12000 },
  { id: "upside", name: "Upside Down", desc: "The horizon rolls. Visual only — orientation still works.", glyph: "⟳", durationMs: 8000 },
  { id: "teleport", name: "Teleporter Shuffle", desc: "Every teleporter pad swaps its destination.", glyph: "⟡", durationMs: 0 },
  { id: "reverse", name: "Reverse Controls", desc: "Left is right. Right is left.", glyph: "⇄", durationMs: 12000 },
  { id: "traffic", name: "Traffic Madness", desc: "Rogue vehicles swarm the streets, ignoring lanes.", glyph: "✕", durationMs: 0 },
  { id: "blackout", name: "Blackout", desc: "No minimap. No streetlights.", glyph: "◼", durationMs: 14000 },
  { id: "fog", name: "Dense Fog", desc: "Visibility drops to near zero.", glyph: "≋", durationMs: 14000 },
  { id: "flood", name: "Flood", desc: "Water rises across low ground.", glyph: "〰", durationMs: 16000 },
  { id: "quake", name: "Earthquake", desc: "The ground shakes violently.", glyph: "⚡", durationMs: 3000 },
  { id: "freeze", name: "Time Freeze", desc: "Every obstacle and the clock stop. You don't.", glyph: "⧗", durationMs: 8000 },
];

export interface WeeklyThemeDef {
  id: string;
  week: string;
  theme: string;
  desc: string;
  color: string;
  mods: {
    traction?: number;
    flood?: boolean;
    rainVisual?: boolean;
    rewardMult?: number;
    extraHazards?: boolean;
    forceEvent?: RealityEventId;
    heatMult?: number;
  };
}

export const WEEKLY: WeeklyThemeDef[] = [
  { id: "rain", week: "01", theme: "Heavy Rain", desc: "Reduced traction. Flooded shortcuts.", color: "#60a5fa", mods: { traction: 0.7, flood: true, rainVisual: true } },
  { id: "alien", week: "02", theme: "Alien Invasion", desc: "Extra hazard props. Reward multiplier x1.5.", color: "#a78bfa", mods: { rewardMult: 1.5, extraHazards: true } },
  { id: "upside", week: "03", theme: "Upside Down City", desc: "Upside Down event is permanently active.", color: "#c8f135", mods: { forceEvent: "upside" } },
  { id: "cyber", week: "04", theme: "Cyber Attack", desc: "GPS is permanently offline.", color: "#ff3b3b", mods: { forceEvent: "blackout" } },
  { id: "lava", week: "05", theme: "Lava City", desc: "Heat zones cover far more ground.", color: "#f97316", mods: { heatMult: 2.0 } },
];

export const MULTIPLAYER_ACTIONS = [
  "Block roads", "Trigger events", "Activate bridges", "Open shortcuts", "Close shortcuts", "Cause traffic",
  "Steal maps", "Hack navigation", "Trigger floods", "Drop smoke", "Deploy EMPs", "Fake checkpoints",
];

export const GAMEPLAY_LOOP = [
  "Accept a delivery contract", "Receive the destination", "Plan your route",
  "The world immediately starts changing", "Adapt", "Reach the destination",
  "Deliver", "Earn money and reputation", "Unlock harder contracts",
];
