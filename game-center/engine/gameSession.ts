import type { GameMode, GameState, GameTransport, ShotRequest } from "./types.ts";

const INITIAL: GameState = {
  phase: "IDLE",
  session: null,
  shot: null,
  finish: null,
  pending: null,
  error: null,
  busy: false,
  paused: false,
};
export const CONNECTION_ERROR = "Ulanishda muammo. Qayta urinib ko‘ring.";
/** Server refusals that are final for the chosen mode (not network trouble): shown as-is and never retried. */
const START_REFUSALS: Record<string, string> = {
  COIN_INSUFFICIENT_BALANCE: "SUN Coin yetarli emas. Mashq rejimi doim bepul.",
  GAME_FREE_COOLDOWN: "Bugungi bepul sovg‘ali urinish ishlatilgan.",
  GAME_REWARD_UNAVAILABLE: "Hozir sovg‘a kampaniyasi yo‘q. Mashq rejimi ochiq.",
  GAME_INVALID_MODE: "Bu rejim mavjud emas.",
  GAME_NOT_AVAILABLE: "SAFI hozir yopiq. Keyinroq qayta urinib ko‘ring.",
  GAME_PRACTICE_DISABLED: "Mashq rejimi vaqtincha yopiq.",
  GAME_REWARD_DISABLED: "Sovg‘ali rejim vaqtincha yopiq. Mashq rejimini tanlang.",
  GAME_MAX_WINS: "Bu kampaniyadagi sovg‘alarni oldingiz. Mashq rejimi ochiq.",
  GAME_REWARD_COOLDOWN: "Keyingi sovg‘a imkoniyati birozdan so‘ng ochiladi. Hozir mashq qilishingiz mumkin.",
};
export type SessionJournal = {
  load: () => Promise<{ requestId: string; mode: GameMode; pending: ShotRequest | null } | null>;
  save: (value: { requestId: string; mode: GameMode; pending: ShotRequest | null } | null) => Promise<void>;
};
export function startRefusal(error: unknown): string | null {
  const message = (error as { message?: string } | null)?.message ?? "";
  return START_REFUSALS[message] ?? null;
}
export function canAccessGameCenter(
  appInterface: string | null,
  _plan?: string,
): boolean {
  return appInterface === "client";
}
export function isValidZone(zone: number): boolean {
  return Number.isInteger(zone) && zone >= 1 && zone <= 15;
}

/** Transport-independent controller. Only server responses can change score or award rewards.
 * Input locks synchronously, before any async work. An ambiguous failure retains the SAME request.
 */
export class GameSession {
  private state: GameState = { ...INITIAL };
  private listeners = new Set<() => void>();
  private startId: string | null = null;
  private startMode: GameMode = "practice";
  private generation = 0;
  private readonly transport: GameTransport;
  private readonly uuid: () => string;
  private readonly gameId: string;
  private journal: SessionJournal | undefined;
  constructor(
    transport: GameTransport,
    uuid: () => string,
    gameId = "safi-penalty",
    journal?: SessionJournal,
  ) {
    this.transport = transport;
    this.uuid = uuid;
    this.gameId = gameId;
    this.journal = journal;
  }
  private async persist(pending = this.state.pending) {
    await this.journal?.save(this.startId ? { requestId: this.startId, mode: this.startMode, pending } : null);
  }
  async restore() {
    if (!this.journal || this.state.phase !== "IDLE") return;
    const generation = this.generation;
    const saved = await this.journal.load().catch(() => null);
    if (generation !== this.generation || !saved || this.state.phase !== "IDLE") return;
    this.startId = saved.requestId;
    this.startMode = saved.mode;
    await this.startGame(saved.mode, saved.pending);
  }
  setPaused(paused: boolean) { this.set({ paused }); }
  getGameState = (): GameState => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private set(patch: Partial<GameState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  /** A retry after an ambiguous failure repeats the same request and mode, so a paid start is never charged twice. */
  async startGame(mode: GameMode = this.startMode, restoredPending: ShotRequest | null = null) {
    if (
      this.state.busy ||
      !["IDLE", "STARTING", "FINISHED"].includes(this.state.phase)
    )
      return;
    const generation = ++this.generation;
    if (mode !== this.startMode) this.startId = null;
    this.startMode = mode;
    this.startId ??= this.uuid();
    this.set({ ...INITIAL, paused: this.state.paused, phase: "STARTING", busy: true });
    try {
      if (this.journal) await this.persist(restoredPending);
      const session = await this.transport.startGame(this.gameId, this.startId, mode);
      if (generation !== this.generation) return;
      if (session.gameId !== this.gameId || session.attempts !== 10 || !Number.isInteger(session.score) || session.score < 0 || session.score > session.attemptsUsed || session.attemptsUsed < 0 || session.attemptsUsed > session.attempts)
        throw new Error("Invalid session response");
      this.set({
        session,
        phase: session.attemptsUsed >= session.attempts ? "RESETTING" : "READY",
        busy: false,
      });
      if (restoredPending && restoredPending.sessionId === session.sessionId && restoredPending.attempt >= session.attemptsUsed && restoredPending.attempt <= session.attemptsUsed + 1) {
        this.set({ pending: restoredPending, phase: "SHOOTING" });
        await this.sendPending();
        return;
      }
      if (session.attemptsUsed >= session.attempts) await this.finishGame();
    } catch (error) {
      if (generation !== this.generation) return;
      const refusal = startRefusal(error);
      if (refusal) {
        // Nothing was started or charged: back to the mode choice with a fresh request next time.
        this.startId = null;
        this.set({ ...INITIAL, paused: this.state.paused, error: refusal });
        await this.persist(null).catch(() => undefined);
      } else this.set({ error: CONNECTION_ERROR, busy: false });
    }
  }
  async submitShot(selectedZone: number) {
    const { phase, session } = this.state;
    if (
      phase !== "READY" || this.state.paused ||
      !session ||
      session.attemptsUsed >= session.attempts ||
      !isValidZone(selectedZone)
    )
      return;
    const pending: ShotRequest = {
      sessionId: session.sessionId,
      requestId: this.uuid(),
      attempt: session.attemptsUsed + 1,
      selectedZone,
    };
    this.set({ phase: "SHOOTING", pending, shot: null, error: null });
    await this.sendPending();
  }
  private async sendPending() {
    const { pending, session, busy } = this.state;
    if (!pending || !session || busy) return;
    const generation = this.generation;
    this.set({ busy: true, error: null });
    try {
      if (this.journal) await this.persist(pending);
      const shot = await this.transport.submitShot(pending);
      if (generation !== this.generation) return;
      if (
        shot.sessionId !== session.sessionId ||
        shot.attemptId !== pending.requestId ||
        shot.attempt !== pending.attempt ||
        shot.selectedZone !== pending.selectedZone ||
        !isValidZone(shot.goalkeeperZone) ||
        shot.attempts !== session.attempts ||
        !["CATCH", "GOAL"].includes(shot.result) ||
        shot.score !== session.score + (shot.attempt === session.attemptsUsed ? 0 : shot.result === "GOAL" ? 1 : 0)
      )
        throw new Error("Invalid server response");
      this.set({
        phase: "RESOLVING",
        shot,
        pending: null,
        busy: false,
        session: { ...session, score: shot.score, attemptsUsed: shot.attempt },
      });
      // A crash before this cleanup simply replays the same accepted request on restore.
      await this.persist(null).catch(() => undefined);
    } catch {
      if (generation === this.generation)
        this.set({ error: CONNECTION_ERROR, busy: false });
    }
  }
  beginReset() {
    if (this.state.phase === "RESOLVING") this.set({ phase: "RESETTING" });
  }
  async completeReset() {
    if (this.state.phase !== "RESETTING" || !this.state.session) return;
    if (this.state.session.attemptsUsed === this.state.session.attempts)
      await this.finishGame();
    else this.set({ phase: "READY", shot: null });
  }
  async finishGame() {
    const { session, busy } = this.state;
    if (
      !session ||
      busy ||
      session.attemptsUsed !== session.attempts ||
      this.state.finish
    )
      return;
    const generation = this.generation;
    this.set({ busy: true, error: null });
    try {
      const finish = await this.transport.finishGame(session.sessionId);
      if (generation !== this.generation) return;
      if (finish.attempts !== session.attempts || finish.score !== session.score || (session.mode === "practice" && (finish.reward || (finish.coinAmount ?? 0) > 0 || (finish.engagement?.coinAmount ?? 0) > 0)))
        throw new Error("Invalid finish response");
      this.set({
        phase: "FINISHED",
        finish,
        busy: false,
        session: { ...session, score: finish.score },
      });
      this.startId = null;
      await this.persist(null).catch(() => undefined);
    } catch {
      if (generation === this.generation)
        this.set({ error: CONNECTION_ERROR, busy: false });
    }
  }
  retry = async () => {
    if (this.state.phase === "STARTING") {
      const saved = await this.journal?.load().catch(() => null);
      await this.startGame(this.startMode, saved?.pending ?? null);
    } else if (this.state.pending) await this.sendPending();
    else if (this.state.phase === "RESETTING") await this.finishGame();
  };
  dispose() { this.generation++; this.state = { ...INITIAL }; }
  /** Explicitly abandon an expired/unrecoverable round. The next start still asks the server to resume. */
  leaveRound() {
    this.generation++;
    this.startId = null;
    void this.persist(null).catch(() => undefined);
    this.set({ ...INITIAL });
  }
}
