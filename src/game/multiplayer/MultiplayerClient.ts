import { Client, Room } from "colyseus.js";
import { Auth } from "../backend/backend";

// Point this at your deployed chaos server (see server/README.md).
// wss:// in production, ws:// for local dev against `npm run dev` in server/.
const SERVER_URL = import.meta.env.VITE_CHAOS_SERVER_URL as string | undefined;

export interface RemotePlayer {
  sessionId: string;
  id: string;
  callsign: string;
  vehicleId: string;
  x: number; y: number; z: number; yaw: number;
  integrity: number; heat: number; radiation: number;
  smoked: boolean;
  empDisabled: boolean;
}

export interface ChaosSnapshot {
  seed: number;
  activeEventId: string;
  activeEventEndsAt: number;
  players: RemotePlayer[];
  hazardCars: { id: string; x: number; z: number }[];
  blockedZones: { id: string; x: number; z: number; radius: number }[];
}

type SnapshotListener = (snapshot: ChaosSnapshot) => void;
type RejectionListener = (info: { reason: string; action: string; retryInMs?: number }) => void;

class MultiplayerClientService {
  private client: Client | null = null;
  private room: Room | null = null;
  private listeners = new Set<SnapshotListener>();
  private rejectionListeners = new Set<RejectionListener>();

  get connected() { return this.room !== null; }
  get sessionId() { return this.room?.sessionId ?? null; }

  isConfigured() { return Boolean(SERVER_URL); }

  async connect(vehicleId: string, packageId: string): Promise<boolean> {
    if (!SERVER_URL) return false;
    this.client = new Client(SERVER_URL);

    const accessToken = Auth.getAccessToken(); // null in local demo mode -> server joins you as a guest
    const profile = Auth.getProfile();
    const options: Record<string, unknown> = {
      vehicleId, packageId,
      accessToken: accessToken ?? undefined,
      guestName: profile?.callsign ?? "GUEST",
    };

    try {
      this.room = await this.client.joinOrCreate("chaos_room", options);
    } catch (e) {
      console.error("Failed to join chaos room:", e);
      this.room = null;
      return false;
    }

    this.room.onStateChange((state) => {
      const snapshot = this.toSnapshot(state);
      this.listeners.forEach((l) => l(snapshot));
    });
    this.room.onMessage("interfere_rejected", (payload) => {
      this.rejectionListeners.forEach((l) => l(payload));
    });
    this.room.onLeave(() => { this.room = null; });

    return true;
  }

  disconnect() {
    this.room?.leave();
    this.room = null;
  }

  sendInput(turn: number, move: number, jump: boolean) {
    this.room?.send("input", { turn, move, jump });
  }

  sendInterfere(action: string, targetX?: number, targetZ?: number, targetId?: string) {
    this.room?.send("interfere", { action, targetX, targetZ, targetId });
  }

  onSnapshot(listener: SnapshotListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onRejection(listener: RejectionListener) {
    this.rejectionListeners.add(listener);
    return () => this.rejectionListeners.delete(listener);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toSnapshot(state: any): ChaosSnapshot {
    const players: RemotePlayer[] = [];
    state.players.forEach((p: RemotePlayer, sessionId: string) => {
      players.push({ ...p, sessionId });
    });
    const hazardCars: ChaosSnapshot["hazardCars"] = [];
    state.hazardCars.forEach((c: { id: string; x: number; z: number }) => hazardCars.push({ id: c.id, x: c.x, z: c.z }));
    const blockedZones: ChaosSnapshot["blockedZones"] = [];
    state.blockedZones.forEach((z: { id: string; x: number; z: number; radius: number }) =>
      blockedZones.push({ id: z.id, x: z.x, z: z.z, radius: z.radius }));

    return {
      seed: state.seed,
      activeEventId: state.activeEventId,
      activeEventEndsAt: state.activeEventEndsAt,
      players, hazardCars, blockedZones,
    };
  }
}

export const MultiplayerClient = new MultiplayerClientService();
