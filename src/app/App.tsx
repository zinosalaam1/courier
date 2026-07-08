import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Auth } from "../game/backend/backend";
import {
  Package,
  Zap,
  Shield,
  Clock,
  Skull,
  Dumbbell,
  HelpCircle,
  Snowflake,
  ChevronRight,
  Menu,
  X,
  Radio,
} from "lucide-react";

const MONO = "'DM Mono', monospace";
const DISPLAY = "'Chakra Petch', sans-serif";

const PACKAGES = [
  {
    id: "standard",
    name: "Standard",
    rule: "Simply reach the destination.",
    color: "#7a8694",
    icon: Package,
    threat: "LOW",
  },
  {
    id: "fragile",
    name: "Fragile",
    rule: "Jump too high. Break it. Mission failed.",
    color: "#60a5fa",
    icon: Shield,
    threat: "MEDIUM",
  },
  {
    id: "frozen",
    name: "Frozen",
    rule: "Stay near heat too long. Delivery fails.",
    color: "#67e8f9",
    icon: Snowflake,
    threat: "MEDIUM",
  },
  {
    id: "radioactive",
    name: "Radioactive",
    rule: "Standing still increases radiation. Keep moving.",
    color: "#c8f135",
    icon: Zap,
    threat: "HIGH",
  },
  {
    id: "unstable",
    name: "Unstable",
    rule: "Every collision damages it.",
    color: "#f97316",
    icon: Skull,
    threat: "HIGH",
  },
  {
    id: "heavy",
    name: "Heavy",
    rule: "Movement becomes significantly slower.",
    color: "#a78bfa",
    icon: Dumbbell,
    threat: "MEDIUM",
  },
  {
    id: "time",
    name: "Time-Locked",
    rule: "Must arrive within five minutes. No exceptions.",
    color: "#ff3b3b",
    icon: Clock,
    threat: "CRITICAL",
  },
  {
    id: "unknown",
    name: "Unknown",
    rule: "Rules are revealed only halfway through the mission.",
    color: "#fbbf24",
    icon: HelpCircle,
    threat: "???",
  },
];

const REALITY_EVENTS = [
  { name: "Gravity Shift", desc: "Everyone walks on walls.", glyph: "↕" },
  { name: "Upside Down", desc: "Entire city inverts.", glyph: "⟳" },
  { name: "Teleporter Shuffle", desc: "Every teleporter swaps destinations.", glyph: "⟡" },
  { name: "Reverse Controls", desc: "Left is right. Right is left.", glyph: "⇄" },
  { name: "Traffic Madness", desc: "Cars ignore all laws.", glyph: "✕" },
  { name: "Blackout", desc: "No GPS. No minimap. No lights.", glyph: "◼" },
  { name: "Dense Fog", desc: "Visibility drops to near zero.", glyph: "≋" },
  { name: "Flood", desc: "Roads vanish. Boats emerge.", glyph: "〰" },
  { name: "Earthquake", desc: "Buildings fall. Routes reshape.", glyph: "⚡" },
  { name: "Time Freeze", desc: "Everything stops. Except you.", glyph: "⧗" },
];

const VEHICLES = [
  { id: "bicycle", tier: "01", name: "Bicycle", stats: "Fast · Cheap · Exposed" },
  { id: "moto", tier: "02", name: "Motorcycle", stats: "Speed · Balance · Urban agility" },
  { id: "van", tier: "03", name: "Delivery Van", stats: "High capacity · Slow · Armored" },
  { id: "hover", tier: "04", name: "Hover Bike", stats: "Water crossing · Elevated routes" },
  { id: "grapple", tier: "05", name: "Grappling Suit", stats: "Rooftop traversal · Vertical" },
  { id: "drone", tier: "06", name: "Drone Delivery", stats: "Air superiority · Time-limited" },
  { id: "teleport", tier: "07", name: "Teleport Boots", stats: "Instant skip · Very limited uses" },
  { id: "skateboard", tier: "08", name: "Magnetic Skateboard", stats: "Wall riding · Extreme precision" },
];

const GADGETS = [
  { name: "EMP Device", desc: "Disables electronic obstacles" },
  { name: "Portable Bridge", desc: "Create your own shortcut" },
  { name: "Fake GPS", desc: "Confuses rival couriers" },
  { name: "Smoke Device", desc: "Hide from surveillance drones" },
  { name: "Repair Kit", desc: "Fix a damaged package mid-route" },
  { name: "Jump Pads", desc: "Launch across impossible gaps" },
];

const WEEKLY = [
  { id: "rain", week: "01", theme: "Heavy Rain", desc: "Reduced traction. Flooded shortcuts. Water routes open.", color: "#60a5fa" },
  { id: "alien", week: "02", theme: "Alien Invasion", desc: "Extraterrestrial interference. Unique obstacles. Exclusive rewards.", color: "#a78bfa" },
  { id: "upside", week: "03", theme: "Upside Down City", desc: "Permanent gravity inversion for 7 full days.", color: "#c8f135" },
  { id: "cyber", week: "04", theme: "Cyber Attack", desc: "GPS permanently offline. Navigate by landmarks alone.", color: "#ff3b3b" },
  { id: "lava", week: "05", theme: "Lava City", desc: "Road sections melt in real time. Adapt or burn.", color: "#f97316" },
];

const COMMUNITY = [
  { label: "Speed Runs", desc: "Who delivered fastest?", glyph: "⚡", metric: "00:47.3", sub: "WORLD RECORD" },
  { label: "Perfect Runs", desc: "No damage. No wrong turns. No power-ups.", glyph: "◈", metric: "847", sub: "PERFECT DELIVERIES" },
  { label: "Chaos Runs", desc: "Most reality glitches survived in one delivery.", glyph: "⟳", metric: "23", sub: "EVENTS SURVIVED" },
  { label: "Replay Vault", desc: "\"How did you survive THAT?\"", glyph: "▷", metric: "12.4K", sub: "REPLAYS UPLOADED" },
];

const MULTIPLAYER_ACTIONS = [
  "Block roads", "Trigger events", "Activate bridges",
  "Open shortcuts", "Close shortcuts", "Cause traffic",
  "Steal maps", "Hack navigation", "Trigger floods",
  "Drop smoke", "Deploy EMPs", "Fake checkpoints",
];

export default function App() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredPkg, setHoveredPkg] = useState<string | null>(null);
  const [speedRun, setSpeedRun] = useState<{ metric: string; sub: string }>({ metric: "…", sub: "LOADING" });

  useEffect(() => {
    Auth.fetchLeaderboard()
      .then((rows) => {
        const best = rows.filter((r) => (r.best_time ?? 0) > 0).sort((a, b) => (a.best_time ?? 0) - (b.best_time ?? 0))[0];
        if (!best) { setSpeedRun({ metric: "--:--", sub: Auth.isLocalMode() ? "NO RUNS YET (LOCAL)" : "NO RUNS YET" }); return; }
        const m = Math.floor((best.best_time ?? 0) / 60), s = ((best.best_time ?? 0) % 60).toFixed(1).padStart(4, "0");
        setSpeedRun({ metric: `${String(m).padStart(2, "0")}:${s}`, sub: `WORLD RECORD · ${best.callsign}` });
      })
      .catch(() => setSpeedRun({ metric: "--:--", sub: "UNAVAILABLE" }));
  }, []);

  return (
    <div
      className="min-h-screen bg-background text-foreground overflow-x-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <HexBadge />
            <span
              className="font-bold text-xs tracking-[0.25em] uppercase text-foreground"
              style={{ fontFamily: DISPLAY }}
            >
              Tour Arcade
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {["Missions", "Packages", "City", "Vehicles", "Multiplayer"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-widest uppercase"
                style={{ fontFamily: MONO }}
              >
                {item}
              </a>
            ))}
          </div>

          <button
            className="hidden md:flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 text-xs font-bold tracking-widest uppercase hover:opacity-90 transition-opacity"
            style={{ fontFamily: DISPLAY }}
            onClick={() => navigate("/play")}
          >
            Accept Mission <ChevronRight size={12} />
          </button>

          <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background px-6 py-5 flex flex-col gap-5">
            {["Missions", "Packages", "City", "Vehicles", "Multiplayer"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-xs text-muted-foreground tracking-widest uppercase"
                onClick={() => setMobileOpen(false)}
                style={{ fontFamily: MONO }}
              >
                {item}
              </a>
            ))}
            <button
              className="bg-primary text-primary-foreground px-5 py-3 text-xs font-bold tracking-widest uppercase w-full"
              style={{ fontFamily: DISPLAY }}
              onClick={() => { setMobileOpen(false); navigate("/play"); }}
            >
              Accept Mission
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14">
        {/* City background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&h=1080&fit=crop&auto=format"
            alt="City at night"
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/50 to-background" />
          {/* Scanlines */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(200,241,53,0.015) 3px, rgba(200,241,53,0.015) 4px)",
            }}
          />
        </div>

        {/* Top-left classified tag */}
        <div className="absolute top-20 left-6 md:left-12 z-10">
          <div className="border border-primary/30 bg-background/60 px-3 py-1.5 backdrop-blur-sm">
            <span className="text-xs tracking-[0.3em] text-primary uppercase" style={{ fontFamily: MONO }}>
              // COURIER ZERO
            </span>
          </div>
        </div>

        {/* Right side vertical text */}
        <div className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 z-10 flex-col items-center gap-3">
          <div className="w-px h-20 bg-gradient-to-b from-transparent to-primary/40" />
          <span
            className="text-xs text-primary/40 tracking-[0.4em] uppercase"
            style={{ fontFamily: MONO, writingMode: "vertical-rl" }}
          >
            Season One · Active
          </span>
          <div className="w-px h-20 bg-gradient-to-b from-primary/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <div className="mb-6">
            <span
              className="inline-block text-xs tracking-[0.4em] text-primary border border-primary/30 px-4 py-2 uppercase"
              style={{ fontFamily: MONO }}
            >
              Mission Type: Impossible Delivery
            </span>
          </div>

          <h1
            className="text-[18vw] md:text-[14vw] lg:text-[11vw] font-bold leading-none tracking-tighter text-foreground uppercase mb-3"
            style={{ fontFamily: DISPLAY }}
          >
            TOUR
          </h1>
          <h1
            className="text-[18vw] md:text-[14vw] lg:text-[11vw] font-bold leading-none tracking-tighter text-primary uppercase mb-8"
            style={{ fontFamily: DISPLAY }}
          >
            ARCADE
          </h1>

          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-primary/40" />
            <p className="text-sm md:text-base text-muted-foreground tracking-[0.25em] uppercase" style={{ fontFamily: MONO }}>
              "Just deliver the package."
            </p>
            <div className="h-px w-16 bg-primary/40" />
          </div>

          <p className="text-base text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">
            It sounds easy. It never is. Every delivery becomes a unique story. The city is watching. So is everyone else.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              className="w-full sm:w-auto bg-primary text-primary-foreground px-10 py-4 font-bold tracking-widest uppercase text-xs hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
              style={{ fontFamily: DISPLAY }}
              onClick={() => navigate("/play")}
            >
              Accept Contract <ChevronRight size={14} />
            </button>
            <button
              className="w-full sm:w-auto border border-foreground/15 text-foreground/70 px-10 py-4 font-bold tracking-widest uppercase text-xs hover:border-primary/40 hover:text-primary transition-all"
              style={{ fontFamily: DISPLAY }}
            >
              Watch Trailer
            </button>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <div className="w-px h-10 bg-gradient-to-b from-primary/60 to-transparent animate-pulse" />
          <span className="text-xs tracking-widest text-muted-foreground uppercase" style={{ fontFamily: MONO }}>
            Scroll
          </span>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="border-y border-primary/15 bg-primary/[0.04] py-3 overflow-hidden">
        <div className="flex gap-10 whitespace-nowrap animate-marquee">
          {[...Array(2)].flatMap((_, copy) =>
            [
              "IMPOSSIBLE DELIVERY",
              "⬡",
              "LIVING CITY",
              "⬡",
              "REALITY GLITCHES",
              "⬡",
              "COURIER ZERO",
              "⬡",
              "20-PLAYER CHAOS",
              "⬡",
              "LEGENDARY CONTRACTS",
              "⬡",
              "DO NOT LOSE THE PACKAGE",
              "⬡",
            ].map((t, i) => (
              <span
                key={`${copy}-${i}`}
                className="text-xs tracking-[0.3em] text-primary/60 uppercase shrink-0"
                style={{ fontFamily: MONO }}
              >
                {t}
              </span>
            ))
          )}
        </div>
      </div>

      {/* ── STORY / BRIEFING ── */}
      <section id="missions" className="max-w-7xl mx-auto px-6 py-28 md:py-36">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <Label>Briefing File #001</Label>
            <h2
              className="text-5xl md:text-6xl font-bold uppercase leading-[1.05] mb-8 text-foreground"
              style={{ fontFamily: DISPLAY }}
            >
              You Work For <span className="text-primary">No One.</span>
              <br />
              You Deliver For Everyone.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-5 text-sm">
              Every player is a courier working for an anonymous organization known only as Courier Zero.
              Your mission seems simple: deliver a package from Point A to Point B.
            </p>
            <p className="text-muted-foreground leading-relaxed text-sm">
              You are never told what's inside. Who sent it. Why everyone wants to stop you. The only
              instruction you receive is:{" "}
              <span className="text-primary font-semibold">"Do not lose the package."</span>
            </p>
          </div>

          {/* Classified dossier card */}
          <div className="relative">
            <div className="border border-primary/20 bg-card p-8 relative">
              <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-primary/20 px-3 py-1">
                <span className="text-xs text-primary" style={{ fontFamily: MONO }}>
                  CLASSIFIED
                </span>
              </div>
              <div className="mb-6">
                <span className="text-xs text-muted-foreground tracking-widest uppercase" style={{ fontFamily: MONO }}>
                  Core Gameplay Loop
                </span>
              </div>
              <div className="space-y-4">
                {[
                  "Accept a delivery contract",
                  "Receive the destination",
                  "Plan your route",
                  "The world immediately starts changing",
                  "Adapt",
                  "Reach the destination",
                  "Deliver",
                  "Earn money and reputation",
                  "Unlock harder contracts",
                ].map((step, i) => (
                  <div key={step} className="flex items-center gap-4">
                    <span className="text-xs text-primary/50 w-6 shrink-0" style={{ fontFamily: MONO }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="h-px w-5 bg-border shrink-0" />
                    <span className="text-sm text-foreground/80">{step}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground italic">
                  "Every delivery becomes a unique story."
                </p>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 border-b border-r border-primary/25" />
            <div className="absolute -top-4 -left-4 w-8 h-8 border-t border-l border-primary/25" />
          </div>
        </div>
      </section>

      {/* ── PACKAGES ── */}
      <section id="packages" className="py-28 md:py-36 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <Label>Package Classification System</Label>
          <h2
            className="text-5xl md:text-6xl font-bold uppercase text-foreground mb-12 leading-tight"
            style={{ fontFamily: DISPLAY }}
          >
            Not Every <span className="text-primary">Package</span>
            <br />
            Behaves The Same.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PACKAGES.map((pkg) => {
              const Icon = pkg.icon;
              const isHovered = hoveredPkg === pkg.id;
              return (
                <div
                  key={pkg.id}
                  className="border bg-card p-6 cursor-pointer transition-all duration-200 relative overflow-hidden"
                  style={{
                    borderColor: isHovered ? pkg.color + "60" : "rgba(200,241,53,0.1)",
                  }}
                  onMouseEnter={() => setHoveredPkg(pkg.id)}
                  onMouseLeave={() => setHoveredPkg(null)}
                  onClick={() => navigate(`/play?package=${pkg.id}`)}
                >
                  <div
                    className="absolute inset-0 transition-opacity duration-200 pointer-events-none"
                    style={{ background: pkg.color, opacity: isHovered ? 0.04 : 0 }}
                  />
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="w-9 h-9 flex items-center justify-center border"
                      style={{ borderColor: pkg.color + "35", color: pkg.color }}
                    >
                      <Icon size={16} />
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 border"
                      style={{
                        borderColor: pkg.color + "30",
                        color: pkg.color,
                        fontFamily: MONO,
                      }}
                    >
                      {pkg.threat}
                    </span>
                  </div>
                  <h3
                    className="font-bold text-xs uppercase mb-2 text-foreground tracking-wider"
                    style={{ fontFamily: DISPLAY }}
                  >
                    {pkg.name} Package
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{pkg.rule}</p>
                  <div
                    className="mt-5 h-px"
                    style={{ background: `linear-gradient(to right, ${pkg.color}50, transparent)` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── LIVING CITY ── */}
      <section id="city" className="py-28 md:py-36 border-t border-border relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, #c8f135, transparent 65%)",
          }}
        />
        <div className="max-w-7xl mx-auto px-6 relative">
          <Label>Adaptive Environment System</Label>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-6">
            <h2
              className="text-5xl md:text-6xl font-bold uppercase text-foreground leading-tight"
              style={{ fontFamily: DISPLAY }}
            >
              The City Is <span className="text-primary">Alive.</span>
              <br />
              It Constantly Reacts.
            </h2>
            <p className="text-muted-foreground max-w-xs text-sm leading-relaxed md:text-right">
              The game isn't cheating. It's adapting. Construction crews appear. Bridges fold.
              Roads become one-way. Alleys vanish. Every route is a gamble.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {REALITY_EVENTS.map((event, i) => (
              <div
                key={event.name}
                className="border border-border bg-card/50 p-4 hover:border-primary/30 hover:bg-card transition-all group cursor-default"
              >
                <div className="text-xl mb-3 text-muted-foreground group-hover:text-primary transition-colors">
                  {event.glyph}
                </div>
                <h4
                  className="text-xs font-bold uppercase tracking-wide text-foreground mb-1.5"
                  style={{ fontFamily: DISPLAY }}
                >
                  {event.name}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{event.desc}</p>
                <div className="mt-3">
                  <span className="text-xs text-primary/30" style={{ fontFamily: MONO }}>
                    EVT_{String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Live alert */}
          <div className="mt-10 border border-primary/25 bg-primary/[0.04] p-5 flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-primary mt-0.5 animate-pulse shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Radio size={12} className="text-primary" />
                <span className="text-xs text-primary font-bold tracking-widest uppercase" style={{ fontFamily: MONO }}>
                  City Alert · Live Event
                </span>
              </div>
              <p className="text-sm text-foreground/70 leading-relaxed">
                A massive solar storm has disrupted navigation. All deliveries in the next 24 hours:{" "}
                <span className="text-primary font-semibold">No minimap · Random gravity shifts · Double rewards.</span>
                {" "}Good luck, Couriers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── VEHICLES + GADGETS ── */}
      <section id="vehicles" className="py-28 md:py-36 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <Label>Transit Arsenal</Label>
          <h2
            className="text-5xl md:text-6xl font-bold uppercase text-foreground mb-14 leading-tight"
            style={{ fontFamily: DISPLAY }}
          >
            Unlock The <span className="text-primary">Impossible.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-14">
            {/* Vehicles list */}
            <div>
              <SectionSubheading>Vehicles</SectionSubheading>
              <div className="space-y-0.5">
                {VEHICLES.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between py-3 px-4 border border-transparent hover:border-border hover:bg-card transition-all group cursor-pointer"
                    onClick={() => navigate(`/play?vehicle=${v.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-primary/35 w-6 shrink-0" style={{ fontFamily: MONO }}>
                        {v.tier}
                      </span>
                      <span
                        className="font-bold text-xs uppercase tracking-wide text-foreground group-hover:text-primary transition-colors"
                        style={{ fontFamily: DISPLAY }}
                      >
                        {v.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: MONO }}>
                      {v.stats}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gadgets grid */}
            <div>
              <SectionSubheading>Gadgets</SectionSubheading>
              <div className="grid grid-cols-2 gap-2">
                {GADGETS.map((g) => (
                  <div
                    key={g.name}
                    className="border border-border bg-card/40 p-4 hover:border-primary/25 transition-all"
                  >
                    <div className="w-1 h-1 bg-primary mb-3" />
                    <h4
                      className="text-xs font-bold uppercase tracking-wide text-foreground mb-1.5"
                      style={{ fontFamily: DISPLAY }}
                    >
                      {g.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">{g.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MULTIPLAYER ── */}
      <section id="multiplayer" className="py-28 md:py-36 border-t border-border relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #ff3b3b, transparent 65%)" }}
        />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-px bg-accent" />
            <span className="text-xs tracking-[0.3em] text-accent uppercase" style={{ fontFamily: MONO }}>
              20-Player Chaos Mode
            </span>
          </div>
          <h2
            className="text-5xl md:text-6xl font-bold uppercase text-foreground mb-6 leading-tight"
            style={{ fontFamily: DISPLAY }}
          >
            Now Things Get <span className="text-accent">Crazy.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mb-12 leading-relaxed text-sm">
            Twenty players all receive deliveries simultaneously. Everyone wants to finish first. Some routes overlap.
            Players can interfere — but not enough to ruin someone's game. Just enough to create tense, unforgettable moments.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {MULTIPLAYER_ACTIONS.map((action, i) => (
              <div
                key={action}
                className="border border-border bg-card/40 p-3 hover:border-accent/25 hover:bg-card transition-all"
              >
                <span className="text-xs text-muted-foreground/50 block mb-1.5" style={{ fontFamily: MONO }}>
                  ACT_{String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="text-xs font-bold uppercase tracking-wide text-foreground"
                  style={{ fontFamily: DISPLAY }}
                >
                  {action}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WEEKLY EVENTS ── */}
      <section className="py-28 md:py-36 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <Label>Season Calendar</Label>
          <h2
            className="text-5xl md:text-6xl font-bold uppercase text-foreground mb-12 leading-tight"
            style={{ fontFamily: DISPLAY }}
          >
            Every Week The City <span className="text-primary">Changes.</span>
          </h2>

          <div className="space-y-2">
            {WEEKLY.map((event) => (
              <div
                key={event.week}
                className="border bg-card/40 p-6 flex flex-col md:flex-row md:items-center gap-4 hover:bg-card transition-all cursor-pointer"
                style={{ borderColor: event.color + "18" }}
                onClick={() => navigate(`/play?theme=${event.id}`)}
              >
                <span
                  className="text-5xl font-bold text-foreground/[0.07] w-20 shrink-0 leading-none"
                  style={{ fontFamily: DISPLAY }}
                >
                  W{event.week}
                </span>
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-bold uppercase tracking-wide mb-1 text-sm"
                    style={{ fontFamily: DISPLAY, color: event.color }}
                  >
                    {event.theme}
                  </h3>
                  <p className="text-sm text-muted-foreground">{event.desc}</p>
                </div>
                <div
                  className="h-1 md:h-12 md:w-px shrink-0 w-16"
                  style={{ background: event.color + "35" }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMUNITY ── */}
      <section className="py-28 md:py-36 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <Label>Community Records</Label>
          <h2
            className="text-5xl md:text-6xl font-bold uppercase text-foreground mb-12 leading-tight"
            style={{ fontFamily: DISPLAY }}
          >
            Prove You're <span className="text-primary">The Best.</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {COMMUNITY.map((item) => {
              const isSpeedRuns = item.label === "Speed Runs";
              const metric = isSpeedRuns ? speedRun.metric : item.metric;
              const sub = isSpeedRuns ? speedRun.sub : item.sub;
              return (
              <div
                key={item.label}
                className="border border-border bg-card p-6 hover:border-primary/25 transition-all"
              >
                <div className="text-xl mb-5 text-primary/50">{item.glyph}</div>
                <h4
                  className="font-bold uppercase text-xs text-foreground mb-2 tracking-wider"
                  style={{ fontFamily: DISPLAY }}
                >
                  {item.label}
                </h4>
                <p className="text-xs text-muted-foreground mb-8 leading-relaxed">{item.desc}</p>
                <div className="pt-4 border-t border-border">
                  <div
                    className="text-3xl font-bold text-primary leading-none"
                    style={{ fontFamily: DISPLAY }}
                  >
                    {metric}
                  </div>
                  <div
                    className="text-xs text-muted-foreground tracking-widest mt-1.5"
                    style={{ fontFamily: MONO }}
                  >
                    {sub}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 md:py-48 border-t border-border relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1920&h=700&fit=crop&auto=format"
            alt="Night city street"
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background" />
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <div className="mb-6">
            <span
              className="inline-block text-xs tracking-[0.4em] text-primary border border-primary/30 px-4 py-2 uppercase"
              style={{ fontFamily: MONO }}
            >
              Incoming Transmission
            </span>
          </div>
          <h2
            className="text-7xl md:text-9xl font-bold uppercase text-foreground leading-none mb-8"
            style={{ fontFamily: DISPLAY }}
          >
            Do Not
            <br />
            Lose The
            <br />
            <span className="text-primary">Package.</span>
          </h2>
          <p className="text-muted-foreground mb-10 text-base max-w-md mx-auto leading-relaxed">
            The highest-ranked couriers unlock Legendary Contracts. The rest just deliver. Which are you?
          </p>
          <button
            className="bg-primary text-primary-foreground px-14 py-5 font-bold tracking-widest uppercase text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-3"
            style={{ fontFamily: DISPLAY }}
            onClick={() => navigate("/play")}
          >
            Accept The Mission <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <HexBadge small />
            <span className="text-xs text-muted-foreground" style={{ fontFamily: MONO }}>
              COURIER ZERO · TOUR ARCADE · 2026
            </span>
          </div>
          <div className="flex gap-8">
            {["Press Kit", "Discord", "Twitter", "Privacy"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                style={{ fontFamily: MONO }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 28s linear infinite;
        }
        ::-webkit-scrollbar { display: none; }
        * { scrollbar-width: none; }
      `}</style>
    </div>
  );
}

function HexBadge({ small }: { small?: boolean }) {
  const size = small ? "w-5 h-5" : "w-7 h-7";
  return (
    <div
      className={`${size} bg-primary flex items-center justify-center shrink-0`}
      style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
    >
      <span
        className="font-bold text-primary-foreground leading-none"
        style={{ fontFamily: DISPLAY, fontSize: small ? "7px" : "9px" }}
      >
        C0
      </span>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-6 h-px bg-primary" />
      <span
        className="text-xs tracking-[0.3em] text-primary uppercase"
        style={{ fontFamily: MONO }}
      >
        {children}
      </span>
    </div>
  );
}

function SectionSubheading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-sm font-bold uppercase text-foreground mb-5 tracking-widest border-b border-border pb-4"
      style={{ fontFamily: DISPLAY }}
    >
      {children}
    </h3>
  );
}
