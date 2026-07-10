import { useGameStore } from "../store/gameStore";
import { CHARACTERS } from "../data/characters";

export function CharacterSelect() {
  const characterId = useGameStore((s) => s.characterId);
  const setCharacterId = useGameStore((s) => s.setCharacterId);
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#07090cea] px-6">
      <div className="relative max-h-[88vh] w-full max-w-[720px] overflow-y-auto border border-[#c8f13524] bg-[#0d1117] p-8">
        <button className="absolute right-4 top-4 font-mono text-lg text-[#7a8694] hover:text-[#c8f135]" onClick={() => setScreen("menu")}>✕</button>
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="h-px w-[22px] bg-[#c8f135]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#c8f135]">Courier Roster</span>
        </div>
        <h2 className="mb-2 font-['Chakra_Petch'] text-2xl font-bold uppercase">Choose Your Courier</h2>
        <p className="mb-6 text-[13px] text-[#7a8694]">
          Your selection carries over to every contract until you change it.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CHARACTERS.map((c) => {
            const selected = c.id === characterId;
            return (
              <button
                key={c.id}
                onClick={() => setCharacterId(c.id)}
                className={`flex flex-col items-center border p-4 text-center transition-colors ${selected ? "border-[#c8f135] bg-[#c8f1350d]" : "border-[#c8f13524] bg-[#0d1117] hover:border-[#c8f13560]"}`}
              >
                <div
                  className="mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2"
                  style={{ borderColor: c.previewColor, background: `${c.previewColor}14` }}
                >
                  <div className="h-8 w-8 rounded-sm" style={{ background: c.previewColor }} />
                </div>
                <h4 className="mb-1 text-[13px] font-bold uppercase tracking-wide" style={{ color: selected ? c.previewColor : "#edf0f4" }}>
                  {c.name}
                </h4>
                <p className="text-[11px] leading-snug text-[#7a8694]">{c.description}</p>
                {c.url && <span className="mt-2 font-mono text-[9px] uppercase tracking-wider text-[#c8f135]">Animated Rig</span>}
                {selected && <span className="mt-2 font-mono text-[9px] uppercase tracking-wider text-[#c8f135]">Selected</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            className="bg-[#c8f135] px-6 py-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-widest text-[#07090c] hover:opacity-90"
            onClick={() => setScreen("menu")}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
