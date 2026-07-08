-- ============================================================
-- Tour Arcade — Courier Zero
-- Supabase schema: profiles + leaderboard
-- Run this in the Supabase SQL editor for your project.
-- ============================================================

-- 1. Profiles table (one row per authenticated user, keyed to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  callsign text not null,
  credits integer not null default 0,
  reputation integer not null default 0,
  deliveries integer not null default 0,
  best_time numeric,               -- seconds, lower is better
  unlocked text[] not null default array['bicycle'],
  created_at timestamptz not null default now()
);

-- 2. Row Level Security: users can read all profiles (for the public
--    leaderboard) but can only write their own row.
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. Helpful index for leaderboard sorting
create index if not exists profiles_reputation_idx on public.profiles (reputation desc);
create index if not exists profiles_best_time_idx on public.profiles (best_time asc);

-- ============================================================
-- MULTIPLAYER PRESENCE (ghost riders)
-- No table needed — the game uses a Supabase Realtime *broadcast*
-- channel ("world-presence"), which is ephemeral and doesn't touch
-- Postgres. Just make sure Realtime is enabled for your project
-- (Project Settings → Realtime) and the anon key has access, which
-- is the default.
-- ============================================================

-- ============================================================
-- NEXT STEP FOR TRUE "20-PLAYER CHAOS MODE"
-- ============================================================
-- The client-side presence channel above only shares POSITIONS —
-- it is a live "ghost" layer, not synced physics or real interference
-- (blocking roads, triggering events on each other, stealing maps, etc).
-- To build the real thing from the landing page, you need a small
-- authoritative game server that:
--   1. Owns the canonical world state (obstacles, events, packages)
--      for a session/room of up to 20 players.
--   2. Receives player inputs (not raw positions) and simulates
--      physics server-side, broadcasting authoritative snapshots.
--   3. Resolves interference actions (block roads, trigger events,
--      steal maps, etc.) as server-validated commands, not client
--      broadcasts, to prevent cheating.
-- A good starting point is a Node.js server using Colyseus or a
-- plain WebSocket server, with Supabase used only for auth + the
-- persistent leaderboard/profile data (as already wired up here).
