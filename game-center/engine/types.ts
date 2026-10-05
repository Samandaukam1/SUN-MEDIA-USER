export type GamePhase =
  | "IDLE"
  | "STARTING"
  | "READY"
  | "SHOOTING"
  | "RESOLVING"
  | "RESETTING"
  | "FINISHED";
/** practice: free and unlimited, no rewards · free: the daily Reward Mode attempt · paid: a Reward Mode attempt for 10 SC. */
export type GameMode = "practice" | "free" | "paid";
export type Session = {
  sessionId: string;
  gameId: string;
  attempts: number;
  attemptsUsed: number;
  score: number;
  rewardEligible: boolean;
  rewardReason: string | null;
  expiresAt: string;
  mode?: GameMode | "legacy";
  coinBalance?: number;
  presentation?: { personality: "CLASSIC" | "SHOWMAN" | "SERIOUS"; arena: "classic" | "night" | "summer" | "new_year" | "ramadan" | "campaign"; boss: boolean; eventTitle?: string | null };
};
export type ShotRequest = {
  sessionId: string;
  requestId: string;
  attempt: number;
  selectedZone: number;
};
export type Shot = {
  visualEvent?: "LUCKY_EGG" | null;
  attemptId: string;
  sessionId: string;
  attempt: number;
  selectedZone: number;
  goalkeeperZone: number;
  result: "CATCH" | "GOAL";
  score: number;
  attempts: number;
};
export type Finish = {
  score: number;
  attempts: number;
  boxes: boolean;
  flagged: boolean;
  /** The reward the server granted for this round (SUN Coin or days of Pro), or null. */
  reward?: { type: "SUN_COIN" | "PRO_DAYS"; amount: number; endsAt?: string | null } | null;
  /** SUN Coin credited by the server for this round (0 when none), and the wallet balance after it. */
  coinAmount?: number;
  coinBalance?: number;
  engagement?: {
    newPersonalBest: boolean;
    personalBest?: number;
    longestCombo?: number;
    unlockedAchievements: { id: string; code: string; title: string }[];
    completedChallenges: { id: string; code: string; title: string; coinsAwarded: number }[];
    coinAmount: number;
    streak: number;
  };
};
export interface GameTransport {
  startGame(gameId: string, requestId: string, mode: GameMode): Promise<Session>;
  submitShot(request: ShotRequest): Promise<Shot>;
  finishGame(sessionId: string): Promise<Finish>;
}
export type GameState = {
  paused: boolean;
  phase: GamePhase;
  session: Session | null;
  shot: Shot | null;
  finish: Finish | null;
  pending: ShotRequest | null;
  error: string | null;
  busy: boolean;
};
export type SoundEvent = "shot" | "catch" | "eggBreak" | "goal" | "reward"
  | "combo" | "hotStreak" | "nearMiss" | "criticalSave" | "achievement"
  | "personalBest" | "luckyEgg" | "bossEntrance" | "cosmeticEquip" | "shopPurchase" | "taunt"
  | "fingertip" | "slowmo" | "tension" | "release";
export type GameFeedback = {
  soundEnabled: boolean;
  hapticsEnabled?: boolean;
  onSound?: (event: SoundEvent) => void;
};
