export type GamePhase =
  | "IDLE"
  | "STARTING"
  | "READY"
  | "SHOOTING"
  | "RESOLVING"
  | "RESETTING"
  | "FINISHED";
export type Session = {
  sessionId: string;
  gameId: string;
  attempts: number;
  attemptsUsed: number;
  score: number;
  rewardEligible: boolean;
  rewardReason: string | null;
  expiresAt: string;
  targetScore: number;
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
};
export type Reward = {
  box: number;
  won: boolean;
  days?: number | null;
  ends_at?: string | null;
  sold_out?: boolean;
};
export interface GameTransport {
  startGame(gameId: string, requestId: string): Promise<Session>;
  submitShot(request: ShotRequest): Promise<Shot>;
  finishGame(sessionId: string): Promise<Finish>;
  claimReward(sessionId: string, box: number): Promise<Reward>;
}
export type GameState = {
  phase: GamePhase;
  session: Session | null;
  shot: Shot | null;
  finish: Finish | null;
  reward: Reward | null;
  pending: ShotRequest | null;
  error: string | null;
  busy: boolean;
};
export type SoundEvent = "shot" | "catch" | "eggBreak" | "goal" | "reward";
export type GameFeedback = {
  soundEnabled: boolean;
  onSound?: (event: SoundEvent) => void;
};
