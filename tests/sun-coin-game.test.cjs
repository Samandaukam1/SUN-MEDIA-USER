const test = require("node:test");
const assert = require("node:assert/strict");
const { GameSession, CONNECTION_ERROR } = require("../game-center/engine/gameSession.ts");
const { prizeTeaser } = require("../features/sun-coin/types.ts");

const session = (mode, extra = {}) => ({
  sessionId: `s-${mode}`, gameId: "safi-penalty", attempts: 10, attemptsUsed: 0, score: 0,
  rewardEligible: mode !== "practice", rewardReason: mode === "practice" ? "PRACTICE" : null,
  expiresAt: "2099-01-01", mode, ...extra,
});
function setup(startGame) {
  let next = 0;
  const starts = [];
  const transport = {
    startGame: async (gameId, requestId, mode) => {
      starts.push({ gameId, requestId, mode });
      return startGame(mode, starts.length);
    },
    submitShot: async () => { throw new Error("unused"); },
    finishGame: async () => { throw new Error("unused"); },
    claimReward: async () => { throw new Error("unused"); },
  };
  return { engine: new GameSession(transport, () => `id-${++next}`), starts };
}

test("the chosen mode reaches the server; practice is the default", async () => {
  const { engine, starts } = setup((mode) => session(mode));
  await engine.startGame();
  assert.equal(starts[0].mode, "practice");
  engine.leaveRound();
  await engine.startGame("paid");
  assert.equal(starts[1].mode, "paid");
  assert.equal(engine.getGameState().session.mode, "paid");
});

test("a refused Reward Mode start is final: plain message, back to the choice, fresh request next time", async () => {
  const { engine, starts } = setup((mode) => {
    if (mode === "paid") throw Object.assign(new Error("COIN_INSUFFICIENT_BALANCE"), { code: "P0403" });
    return session(mode);
  });
  await engine.startGame("paid");
  const state = engine.getGameState();
  assert.equal(state.phase, "IDLE");
  assert.equal(state.busy, false);
  assert.match(state.error, /SUN Coin yetarli emas/);
  await engine.startGame("practice");
  assert.notEqual(starts[1].requestId, starts[0].requestId);
  assert.equal(engine.getGameState().session.mode, "practice");
});

test("free cooldown and missing campaigns are explained, not reported as network trouble", async () => {
  for (const [code, text] of [["GAME_FREE_COOLDOWN", /bepul sovg‘ali urinish ishlatilgan/], ["GAME_REWARD_UNAVAILABLE", /kampaniyasi yo‘q/]]) {
    const { engine } = setup(() => { throw new Error(code); });
    await engine.startGame("free");
    assert.match(engine.getGameState().error, text);
    assert.notEqual(engine.getGameState().error, CONNECTION_ERROR);
  }
});

test("an ambiguous paid start retries the SAME request and mode, so the fee can only be taken once", async () => {
  const { engine, starts } = setup((mode, n) => {
    if (n === 1) throw new Error("network down");
    return session(mode);
  });
  await engine.startGame("paid");
  assert.equal(engine.getGameState().error, CONNECTION_ERROR);
  await engine.retry();
  assert.deepEqual([starts[1].requestId, starts[1].mode], [starts[0].requestId, "paid"]);
  assert.equal(engine.getGameState().phase, "READY");
});

test("switching mode never reuses another mode's request id", async () => {
  const { engine, starts } = setup((mode, n) => {
    if (n === 1) throw new Error("network down");
    return session(mode);
  });
  await engine.startGame("paid");
  engine.leaveRound();
  await engine.startGame("practice");
  assert.notEqual(starts[1].requestId, starts[0].requestId);
});

test("the Reward Mode card names the kinds of prize, never scores, levels or limits", () => {
  assert.equal(prizeTeaser(["SUN_COIN", "PRO_DAYS"]), "Yaxshi natija uchun sovg‘a: SUN Coin yoki Pro");
  assert.equal(prizeTeaser(["SUN_COIN"]), "Yaxshi natija uchun sovg‘a: SUN Coin");
  assert.equal(prizeTeaser([]), "Yaxshi natija uchun sovg‘a");
  for (const kinds of [["SUN_COIN"], ["PRO_DAYS"], ["SUN_COIN", "PRO_DAYS"]]) assert.doesNotMatch(prizeTeaser(kinds), /\d/);
});
