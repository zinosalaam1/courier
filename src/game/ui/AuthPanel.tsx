import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { Auth, SUPABASE_CONFIGURED } from "../backend/backend";

export function AuthPanel() {
  const setScreen = useGameStore((s) => s.setScreen);
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");

  async function handleSignIn() {
    try {
      await Auth.signIn(siEmail.trim(), siPassword);
      setMessage({ text: "Signed in. Welcome back, courier.", error: false });
      setTimeout(() => setScreen("menu"), 700);
    } catch (e) {
      setMessage({ text: (e as Error).message, error: true });
    }
  }

  async function handleSignUp() {
    if (suPassword.length < 6) { setMessage({ text: "Password must be at least 6 characters.", error: true }); return; }
    const callsign = suName.trim() || "Courier";
    try {
      await Auth.signUp(callsign, suEmail.trim(), suPassword);
      setMessage({ text: `Account created. Welcome, ${callsign}.`, error: false });
      setTimeout(() => setScreen("menu"), 900);
    } catch (e) {
      setMessage({ text: (e as Error).message, error: true });
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#07090cea] px-6">
      <div className="relative w-full max-w-[520px] border border-[#c8f13524] bg-[#0d1117] p-8">
        <button className="absolute right-4 top-4 font-mono text-lg text-[#7a8694] hover:text-[#c8f135]" onClick={() => setScreen("menu")}>✕</button>
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="h-px w-[22px] bg-[#c8f135]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#c8f135]">Courier Registration</span>
        </div>

        <div className="mb-4 flex border-b border-[#c8f13524]">
          {(["signin", "signup"] as const).map((t) => (
            <button
              key={t}
              className={`px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider ${tab === t ? "border-b-2 border-[#c8f135] text-[#c8f135]" : "text-[#7a8694]"}`}
              onClick={() => setTab(t)}
            >
              {t === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {message && (
          <div className={`mb-3 border-l-2 px-2.5 py-2 font-mono text-[11px] ${message.error ? "border-[#ff3b3b] bg-[#ff3b3b0f] text-[#ffb3b3]" : "border-[#c8f135] bg-[#c8f1350d]"}`}>
            {message.text}
          </div>
        )}

        {tab === "signin" ? (
          <div>
            <Field label="Email" value={siEmail} onChange={setSiEmail} type="email" placeholder="courier@example.com" />
            <Field label="Password" value={siPassword} onChange={setSiPassword} type="password" placeholder="••••••••" />
            <button className="w-full bg-[#c8f135] py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest text-[#07090c] hover:opacity-90" onClick={handleSignIn}>
              Sign In
            </button>
          </div>
        ) : (
          <div>
            <Field label="Courier Callsign" value={suName} onChange={setSuName} placeholder="e.g. NightRunner" />
            <Field label="Email" value={suEmail} onChange={setSuEmail} type="email" placeholder="courier@example.com" />
            <Field label="Password (min 6 chars)" value={suPassword} onChange={setSuPassword} type="password" placeholder="••••••••" />
            <button className="w-full bg-[#c8f135] py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest text-[#07090c] hover:opacity-90" onClick={handleSignUp}>
              Create Account
            </button>
          </div>
        )}

        <p className="mt-4 text-[13px] leading-relaxed text-[#7a8694]">
          {SUPABASE_CONFIGURED
            ? "Connected to your Supabase project."
            : "Running in local demo mode (no Supabase project configured) — accounts and progress are stored in this browser only. Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to go live."}
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="mb-2.5">
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#7a8694]">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-[#c8f13524] bg-[#161c24] px-3 py-2.5 font-mono text-[13px] text-[#edf0f4] outline-none focus:border-[#c8f135]"
      />
    </div>
  );
}
