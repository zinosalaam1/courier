import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { Scene } from "../game/components/Scene";
import { HUD } from "../game/ui/HUD";
import { MainMenu } from "../game/ui/MainMenu";
import { ContractBoard } from "../game/ui/ContractBoard";
import { AuthPanel } from "../game/ui/AuthPanel";
import { LeaderboardPanel } from "../game/ui/LeaderboardPanel";
import { EndScreen } from "../game/ui/EndScreen";
import { ChaosLobby } from "../game/multiplayer/ChaosLobby";
import { useGameStore } from "../game/store/gameStore";
import { Presence } from "../game/backend/backend";

export default function PlayPage() {
  const [searchParams] = useSearchParams();
  const screen = useGameStore((s) => s.screen);
  const mission = useGameStore((s) => s.mission);
  const setScreen = useGameStore((s) => s.setScreen);
  const setDeepLink = useGameStore((s) => s.setDeepLink);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    Presence.init();

    const packageId = searchParams.get("package");
    const vehicleId = searchParams.get("vehicle");
    const themeId = searchParams.get("theme");
    if (packageId || vehicleId || themeId) {
      setDeepLink({ packageId, vehicleId, themeId });
      setScreen("contract");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-[#07090c]">
      {mission && !mission.ended && (
        <Scene key={mission.startedAt} vehicle={mission.vehicle} theme={mission.theme} />
      )}
      {screen === "mission" && <HUD />}
      {screen === "menu" && <MainMenu />}
      {screen === "contract" && <ContractBoard />}
      {screen === "auth" && <AuthPanel />}
      {screen === "leaderboard" && <LeaderboardPanel />}
      {screen === "end" && <EndScreen />}
      {screen === "chaos" && <ChaosLobby />}
    </div>
  );
}
