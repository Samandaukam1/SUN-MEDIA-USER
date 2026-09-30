import { Stack, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import { GameScreen } from "@/features/games/GameScreen";
import { useNav } from "@/lib/routes";
import { canAccessGameCenter } from "./engine/gameSession";
import { SafiPenaltyGame } from "./games/safi-penalty/SafiPenaltyGame";
export function GameRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { appInterface } = useAuth();
  const nav = useNav();
  if (!canAccessGameCenter(appInterface)) return null;
  if (id !== "safi-penalty") return <GameScreen />;
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafiPenaltyGame onBack={() => nav.back()} />
    </>
  );
}
