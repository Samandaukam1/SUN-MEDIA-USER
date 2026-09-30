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
};
export type ShotRequest = {
  sessionId: string;
  requestId: string;
  attempt: number;
  selectedZone: number;
};
export type Shot = {
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
};
export interface GameTransport {
  startGame(gameId: string, requestId: string, mode: GameMode): Promise<Session>;
  submitShot(request: ShotRequest): Promise<Shot>;
  finishGame(sessionId: string): Promise<Finish>;
}
export type GameState = {
  phase: GamePhase;
  session: Session | null;
  shot: Shot | null;
  finish: Finish | null;
  pending: ShotRequest | null;
  error: string | null;
  busy: boolean;
};
export type SoundEvent = "shot" | "catch" | "eggBreak" | "goal" | "reward";
export type GameFeedback = {
  soundEnabled: boolean;
  onSound?: (event: SoundEvent) => void;
};
