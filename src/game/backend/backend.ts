import { createClient, type SupabaseClient, type RealtimeChannel } from "@supabase/supabase-js";

// Vite env vars - create a .env.local with these to go live (see README).
// Falls back to a fully playable local mode if either is missing.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = SUPABASE_CONFIGURED
  ? createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string)
  : null;

export interface Profile {
  id: string;
  callsign: string;
  credits: number;
  reputation: number;
  deliveries: number;
  best_time: number | null;
  unlocked: string[];
}

export interface LeaderboardRow {
  callsign: string;
  best_time: number | null;
  deliveries: number;
  reputation: number;
}

const LOCAL_ACCOUNTS_KEY = "tourarcade_local_accounts";
const LOCAL_LEADERBOARD_KEY = "tourarcade_local_leaderboard";

interface LocalAccount {
  callsign: string;
  password: string;
  credits: number;
  reputation: number;
  deliveries: number;
  best_time: number | null;
  unlocked: string[];
}

function loadLocalAccounts(): Record<string, LocalAccount> {
  try { return JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY) || "{}"); }
  catch { return {}; }
}
function saveLocalAccounts(store: Record<string, LocalAccount>) {
  localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(store));
}
function loadLocalLeaderboard(): LeaderboardRow[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_LEADERBOARD_KEY) || "[]"); }
  catch { return []; }
}
function saveLocalLeaderboard(rows: LeaderboardRow[]) {
  localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(rows));
}

class AuthService {
  private currentProfile: Profile | null = null;
  private currentEmail: string | null = null;
  private currentAccessToken: string | null = null;

  getProfile() { return this.currentProfile; }
  /** Real Supabase JWT when configured; null in local demo mode (nothing to
   *  verify server-side, so multiplayer joins as a guest instead). */
  getAccessToken() { return this.currentAccessToken; }

  async signUp(callsign: string, email: string, password: string): Promise<Profile> {
    if (!SUPABASE_CONFIGURED || !supabase) {
      const store = loadLocalAccounts();
      if (store[email]) throw new Error("An account with that email already exists (local mode).");
      store[email] = { callsign, password, credits: 0, reputation: 0, deliveries: 0, best_time: null, unlocked: ["bicycle"] };
      saveLocalAccounts(store);
      return this.signIn(email, password);
    }
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { callsign } } });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error("Check your email to confirm your account, then sign in.");
    this.currentAccessToken = data.session.access_token;
    await supabase.from("profiles").upsert({ id: data.user!.id, callsign, credits: 0, reputation: 0, deliveries: 0, unlocked: ["bicycle"] }, { onConflict: "id", ignoreDuplicates: true });
    return this.loadRemoteProfile(data.user!.id);
  }

  async signIn(email: string, password: string): Promise<Profile> {
    if (!SUPABASE_CONFIGURED || !supabase) {
      const store = loadLocalAccounts();
      const rec = store[email];
      if (!rec || rec.password !== password) throw new Error("Invalid email or password (local mode).");
      this.currentEmail = email;
      this.currentAccessToken = null; // no real JWT in local mode - multiplayer server will treat this as a guest
      this.currentProfile = { id: email, callsign: rec.callsign, credits: rec.credits, reputation: rec.reputation, deliveries: rec.deliveries, best_time: rec.best_time, unlocked: rec.unlocked };
      return this.currentProfile;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    this.currentAccessToken = data.session.access_token;
    return this.loadRemoteProfile(data.user.id);
  }

  private async loadRemoteProfile(userId: string): Promise<Profile> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) throw new Error(error.message);
    this.currentProfile = data as Profile;
    return this.currentProfile;
  }

  async saveProgress(delta: { credits: number; reputation: number; time: number | null; unlock?: string }) {
    if (!this.currentProfile) return;
    const p = this.currentProfile;
    p.credits += delta.credits;
    p.reputation += delta.reputation;
    p.deliveries += 1;
    if (delta.time !== null && (p.best_time === null || delta.time < p.best_time)) p.best_time = delta.time;
    if (delta.unlock && !p.unlocked.includes(delta.unlock)) p.unlocked = [...p.unlocked, delta.unlock];

    if (!SUPABASE_CONFIGURED || !supabase) {
      const store = loadLocalAccounts();
      if (this.currentEmail && store[this.currentEmail]) {
        store[this.currentEmail] = { ...store[this.currentEmail], credits: p.credits, reputation: p.reputation, deliveries: p.deliveries, best_time: p.best_time, unlocked: p.unlocked };
        saveLocalAccounts(store);
      }
      const rows = loadLocalLeaderboard().filter(r => r.callsign !== p.callsign);
      rows.push({ callsign: p.callsign, best_time: p.best_time, deliveries: p.deliveries, reputation: p.reputation });
      saveLocalLeaderboard(rows);
      return;
    }
    await supabase.from("profiles").update({ credits: p.credits, reputation: p.reputation, deliveries: p.deliveries, best_time: p.best_time, unlocked: p.unlocked }).eq("id", p.id);
  }

  async fetchLeaderboard(): Promise<LeaderboardRow[]> {
    if (!SUPABASE_CONFIGURED || !supabase) {
      const demo: LeaderboardRow[] = [
        { callsign: "NightRunner", best_time: 47.3, deliveries: 212, reputation: 980 },
        { callsign: "Glitch_09", best_time: 52.1, deliveries: 184, reputation: 860 },
        { callsign: "Kessler", best_time: 55.8, deliveries: 301, reputation: 1120 },
      ];
      return [...demo, ...loadLocalLeaderboard()].sort((a, b) => (a.best_time ?? 9999) - (b.best_time ?? 9999)).slice(0, 20);
    }
    const { data, error } = await supabase.from("profiles").select("callsign,best_time,deliveries,reputation").order("reputation", { ascending: false }).limit(20);
    if (error) throw new Error(error.message);
    return data as LeaderboardRow[];
  }

  signOut() {
    this.currentProfile = null;
    this.currentEmail = null;
    this.currentAccessToken = null;
    if (supabase) supabase.auth.signOut();
  }

  isLocalMode() { return !SUPABASE_CONFIGURED; }
}

export const Auth = new AuthService();

// ---------------------------------------------------------------------------
// Presence: "ghost riders". Real, live position sync via Supabase Realtime
// broadcast IF a project is configured. Otherwise simply inactive (not faked).
// This is NOT the 20-player interference/chaos mode from the landing page -
// that needs an authoritative server. See README.
// ---------------------------------------------------------------------------
export interface GhostState { id: string; x: number; y: number; z: number; name: string; color: string; lastSeen: number; }

class PresenceService {
  private channel: RealtimeChannel | null = null;
  private ghosts = new Map<string, GhostState>();

  init() {
    if (!SUPABASE_CONFIGURED || !supabase) return false;
    this.channel = supabase.channel("world-presence", { config: { broadcast: { self: false } } });
    this.channel.on("broadcast", { event: "pos" }, (msg) => {
      const p = msg.payload as Omit<GhostState, "lastSeen">;
      this.ghosts.set(p.id, { ...p, lastSeen: performance.now() });
    });
    this.channel.subscribe();
    return true;
  }

  broadcast(id: string, x: number, y: number, z: number, name: string, color: string) {
    this.channel?.send({ type: "broadcast", event: "pos", payload: { id, x, y, z, name, color } });
  }

  getGhosts(): GhostState[] {
    const now = performance.now();
    for (const [k, v] of this.ghosts) if (now - v.lastSeen > 5000) this.ghosts.delete(k);
    return Array.from(this.ghosts.values());
  }

  active() { return this.channel !== null; }
}

export const Presence = new PresenceService();
