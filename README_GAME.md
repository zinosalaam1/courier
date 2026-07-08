# Tour Arcade — Courier Zero (real React project)

This is your original uploaded Figma Make project, actually modified: the landing
page (`src/app/App.tsx`) is untouched in content, and a real playable game has been
added alongside it using React Three Fiber, wired together with routing, a shared
data layer, and a shared Supabase-backed backend.

I could not run `npm install`, `npm run dev`, or `npm run build` here — this
environment has no network access to the npm registry — so this has **not been
compiled or run**. I syntax/type-checked every new file with `tsc --noEmit` against
the actual language (catching real bugs like mismatched JSX braces), but the final
verification is `npm install && npm run dev` on your machine.

## Run it
```
npm install
npm run dev
```
Visit `/` for the landing page, `/play` for the game. (Or copy `.env.example` to
`.env.local` and fill in Supabase credentials first if you want real accounts from
the start — fully optional, see below.)

## What changed vs. your upload
- **`package.json`** — added `three`, `@react-three/fiber`, `@react-three/drei`,
  `zustand`, `@supabase/supabase-js`, and `@types/three`. Nothing removed.
- **`src/main.tsx`** — now wraps the app in a router: `/` renders your original
  `App.tsx`, `/play` renders the new `PlayPage.tsx`.
- **`src/app/App.tsx`** — copy and layout untouched. The "Accept Mission" /
  "Accept Contract" / "Accept The Mission" buttons now navigate to `/play`.
  Package cards, vehicle rows, and weekly-theme rows now navigate to
  `/play?package=…` / `?vehicle=…` / `?theme=…`, pre-loading that exact contract in
  the game. The "Speed Runs" community stat now fetches the real current best time
  from the same leaderboard the game writes to, instead of a hardcoded number.
  (`VEHICLES` and `WEEKLY` gained `id` fields to make this possible — everything
  else in those arrays is unchanged.)
- **`src/game/`** — new: the entire game. Nothing here touches your original files
  outside the edits listed above.
- **`src/vite-env.d.ts`, `tsconfig.json`** — added; your upload didn't include
  either (Vite doesn't strictly need them to build, but both help your editor and
  `import.meta.env` typing).

## How `src/game/` is organized
```
data/gameData.ts        8 packages, 8 vehicles, 6 gadgets, 10 reality events, 5 weekly themes
store/gameStore.ts      zustand store: mission state, meters, screen state machine
backend/backend.ts      Supabase auth/profile/leaderboard/presence, + full local fallback
components/             the R3F scene: Player (physics), City, HazardCars, EventsController,
                         CharacterModel (real rigged GLTF + procedural fallback), Rain, etc.
ui/                     HUD, ContractBoard, AuthPanel, LeaderboardPanel, MainMenu, EndScreen
```

## What's real
- Physics-based movement (gravity, jumping, building collisions) via a `useFrame`
  loop in `Player.tsx`.
- All 8 package types with their actual fail/succeed logic (fragile fall damage,
  frozen heat meter, radioactive stillness meter, unstable collision damage,
  heavy speed penalty, time-locked countdown, unknown mid-route reveal).
- All 8 vehicles with distinct stats; reputation-gated unlocks.
- All 6 gadgets with real coded effects (EMP, portable bridge, fake GPS decoy,
  smoke/minimap-hide, repair kit, jump pads).
- All 10 reality events with real effects (gravity shift, reverse controls, traffic
  madness, blackout, dense fog, flood, earthquake, time freeze, teleporter shuffle;
  "Upside Down" is a camera-roll visual only — noted in `EventsController.tsx`).
- 5 weekly themes as real environment/reward modifiers.
- A real rigged, animated character (loads a public rigged model with Idle/Walking/
  Running/Jump clips) with a hand-built, hand-animated fallback character if that
  model can't load.
- Real Supabase-backed sign up/sign in/leaderboard, with a fully working local
  fallback (`localStorage`) if you don't configure Supabase.
- Live "ghost" multiplayer presence via Supabase Realtime broadcast, once configured.

## What's not real (on purpose, not hidden)
Full "20-player chaos mode" — players actively interfering with each other's runs,
shared authoritative world state — needs a real backend game server (e.g. Colyseus,
or Netcode-style authoritative simulation), not something a client-side React app can
honestly claim. `supabase-setup.sql` has a note on the concrete next step.

## Going live with Supabase (optional)
1. Create a Supabase project, run `supabase-setup.sql` in its SQL editor.
2. `cp .env.example .env.local` and fill in `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
3. Restart `npm run dev`. Sign-up/sign-in, progress, and the leaderboard now hit your
   real database; without this step everything still works in local demo mode.

## A note on verification
Every new file passed `tsc --noEmit` for real syntax/type errors (not just "does it
parse" — actual JSX structure, prop types, hook usage). What I *can't* verify without
running it: whether every visual/physics tuning value feels right, whether the GLTF
character URL is still reachable when you build, and general runtime behavior. Treat
this as "should compile and run," not "has been play-tested" — that last step needs
your machine.
