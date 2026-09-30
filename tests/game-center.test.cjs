const test = require("node:test");
const assert = require("node:assert/strict");
const {
  GameSession,
  isValidZone,
  canAccessGameCenter,
} = require("../game-center/engine/gameSession.ts");
const {
  ZONES,
  zonePoint,
  arenaLayout,
  eggTrajectory,
} = require("../game-center/games/safi-penalty/physics.ts");
function setup(overrides = {}) {
  let next = 0,
    score = 0,
    count = 0;
  const calls = [];
  const transport = {
    startGame: async () => ({
      sessionId: "session",
      gameId: "safi-penalty",
      attempts: 10,
      attemptsUsed: 0,
      score: 0,
      rewardEligible: false,
      rewardReason: "COOLDOWN",
      expiresAt: "2099-01-01",
      targetScore: 7,
    }),
    submitShot: async (r) => {
      calls.push(r);
      count++;
      const result = r.selectedZone === 8 ? "CATCH" : "GOAL";
      score += result === "GOAL" ? 1 : 0;
      return {
        attemptId: r.requestId,
        sessionId: r.sessionId,
        attempt: r.attempt,
        selectedZone: r.selectedZone,
        goalkeeperZone: 8,
        result,
        score,
        attempts: 10,
      };
    },
    finishGame: async () => ({
      score,
      attempts: 10,
      boxes: false,
      flagged: false,
    }),
    claimReward: async () => ({ box: 0, won: true, days: 3 }),
    ...overrides,
  };
  return {
    engine: new GameSession(transport, () => `id-${++next}`),
    calls,
    count: () => count,
  };
}
test("exactly 3 rows × 5 columns; 15 normalized accessible zones", () => {
  assert.equal(ZONES.length, 15);
  assert.equal(new Set(ZONES.map((z) => z.id)).size, 15);
  for (const w of [288, 343, 480]) {
    const { goal } = arenaLayout(w);
    assert.ok(goal.width / 5 >= 44);
    assert.ok(goal.height / 3 >= 44);
    ZONES.forEach((z) => {
      const p = zonePoint(z.id, goal);
      assert.ok(
        p.x > goal.x &&
          p.x < goal.x + goal.width &&
          p.y > goal.y &&
          p.y < goal.y + goal.height,
      );
    });
  }
  assert.equal(new Set(ZONES.map((z) => z.label)).size, 15);
});
test("only integer zones 1–15 accepted", () => {
  for (const z of [-1, 0, 16, 1.5, NaN, Infinity, null, "1"])
    assert.equal(isValidZone(z), false);
  for (const z of ZONES) assert.equal(isValidZone(z.id), true);
  assert.throws(() => zonePoint(0, arenaLayout(343).goal));
});
test("trajectory starts at shooter and ends at target, with an arc", () => {
  const start = { x: 100, y: 300 },
    end = { x: 20, y: 80 };
  assert.deepEqual(eggTrajectory(start, end, 0, 30), start);
  const last = eggTrajectory(start, end, 1, 30);
  assert.ok(Math.abs(last.x - end.x) < 1e-6 && Math.abs(last.y - end.y) < 1e-6);
  assert.ok(eggTrajectory(start, end, 0.5, 30).y < (start.y + end.y) / 2);
});
test("Free, Pro, trial and promo clients can play; employees cannot", () => {
  for (const plan of ["free", "pro", "trial", "promo"])
    assert.equal(canAccessGameCenter("client", plan), true);
  for (const role of [
    "management",
    "employee",
    "system_owner",
    "admin",
    "rahbar",
    "operator",
    "smm",
    null,
  ])
    assert.equal(canAccessGameCenter(role, "pro"), false);
});
test("reward cooldown does not block a round", async () => {
  const { engine } = setup();
  await engine.startGame();
  assert.equal(engine.getGameState().phase, "READY");
  assert.equal(engine.getGameState().session.rewardEligible, false);
  await engine.submitShot(1);
  assert.equal(engine.getGameState().shot.result, "GOAL");
});
test("tap synchronously locks input; no second request during flight/reset", async () => {
  let resolve;
  const { engine, calls } = setup({
    submitShot: (r) => {
      calls.push(r);
      return new Promise((r) => {
        resolve = r;
      });
    },
  });
  await engine.startGame();
  const first = engine.submitShot(1);
  await engine.submitShot(5);
  assert.equal(calls.length, 1);
  assert.equal(engine.getGameState().phase, "SHOOTING");
  resolve({
    attemptId: calls[0].requestId,
    sessionId: "session",
    attempt: 1,
    selectedZone: 1,
    goalkeeperZone: 8,
    result: "GOAL",
    score: 1,
    attempts: 10,
  });
  await first;
  await engine.submitShot(5);
  assert.equal(calls.length, 1);
  engine.beginReset();
  await engine.submitShot(5);
  assert.equal(calls.length, 1);
  await engine.completeReset();
  assert.equal(engine.getGameState().phase, "READY");
});
test("CATCH +0, GOAL +1, ten attempts and no eleventh; replay creates a clean round", async () => {
  const { engine, count } = setup();
  await engine.startGame();
  for (let n = 1; n <= 10; n++) {
    await engine.submitShot(n === 1 ? 8 : 1);
    assert.equal(engine.getGameState().session.score, n - 1);
    engine.beginReset();
    await engine.completeReset();
  }
  assert.equal(engine.getGameState().phase, "FINISHED");
  assert.equal(engine.getGameState().finish.score, 9);
  await engine.submitShot(1);
  assert.equal(count(), 10);
  await engine.startGame();
  assert.equal(engine.getGameState().phase, "READY");
  assert.equal(engine.getGameState().session.score, 0);
});
test("ambiguous network failure retains identical idempotency key and zone; never invents a result", async () => {
  let fails = true;
  const { engine, calls } = setup({
    submitShot: async (r) => {
      calls.push(r);
      if (fails) throw Error("response lost");
      return {
        attemptId: r.requestId,
        sessionId: r.sessionId,
        attempt: r.attempt,
        selectedZone: r.selectedZone,
        goalkeeperZone: 8,
        result: "GOAL",
        score: 1,
        attempts: 10,
      };
    },
  });
  await engine.startGame();
  await engine.submitShot(5);
  assert.equal(engine.getGameState().session.attemptsUsed, 0);
  assert.equal(engine.getGameState().session.score, 0);
  assert.ok(engine.getGameState().error);
  await engine.submitShot(1);
  assert.equal(calls.length, 1);
  fails = false;
  await engine.retry();
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(engine.getGameState().session.attemptsUsed, 1);
});
test("invalid server response cannot inflate score; controller has no client score argument", async () => {
  const { engine } = setup({
    submitShot: async (r) => ({
      attemptId: r.requestId,
      sessionId: r.sessionId,
      attempt: 1,
      selectedZone: r.selectedZone,
      goalkeeperZone: 8,
      result: "GOAL",
      score: 99,
      attempts: 10,
    }),
  });
  await engine.startGame();
  await engine.submitShot(1);
  assert.equal(engine.getGameState().session.score, 0);
  assert.ok(engine.getGameState().error);
});
test("finish request can safely retry without a new shot", async () => {
  let finishCalls = 0;
  const { engine } = setup({
    startGame: async () => ({
      sessionId: "session",
      gameId: "safi-penalty",
      attempts: 10,
      attemptsUsed: 10,
      score: 7,
      rewardEligible: true,
      rewardReason: null,
      expiresAt: "2099",
      targetScore: 7,
    }),
    finishGame: async () => {
      if (++finishCalls === 1) throw Error("offline");
      return { score: 7, attempts: 10, boxes: true, flagged: false };
    },
  });
  await engine.startGame();
  assert.ok(engine.getGameState().error);
  await engine.retry();
  assert.equal(engine.getGameState().phase, "FINISHED");
  assert.equal(finishCalls, 2);
});
test("reward claim requires server boxes and only one claim runs at a time", async () => {
  let claims = 0;
  const { engine } = setup({
    claimReward: async () => {
      claims++;
      return { box: 0, won: true };
    },
  });
  await engine.startGame();
  await engine.claimReward(0);
  assert.equal(claims, 0);
});

test("eligible reveal serializes claims and displays the single server reward", async () => {
  let resolve,
    claims = 0;
  const { engine } = setup({
    startGame: async () => ({
      sessionId: "session",
      gameId: "safi-penalty",
      attempts: 10,
      attemptsUsed: 10,
      score: 8,
      rewardEligible: true,
      rewardReason: null,
      expiresAt: "2099",
      targetScore: 7,
    }),
    finishGame: async () => ({
      score: 8,
      attempts: 10,
      boxes: true,
      flagged: false,
    }),
    claimReward: async () => {
      claims++;
      return new Promise((r) => {
        resolve = r;
      });
    },
  });
  await engine.startGame();
  const first = engine.claimReward(1);
  await engine.claimReward(2);
  assert.equal(claims, 1);
  resolve({ box: 1, won: true, days: 3 });
  await first;
  await engine.claimReward(0);
  assert.equal(claims, 1);
  assert.equal(engine.getGameState().reward.days, 3);
});
