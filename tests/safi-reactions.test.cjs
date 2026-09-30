const test = require("node:test");
const assert = require("node:assert/strict");
const r = require("../game-center/games/safi-penalty/reactions.ts");

test("10 unique taunt reactions, the ones asked for", () => {
  assert.equal(r.REACTIONS.length, 10);
  assert.equal(new Set(r.REACTIONS.map((x) => x.id)).size, 10);
  assert.deepEqual(r.REACTIONS.map((x) => x.id), [
    "eyes-closed", "one-hand", "head-shake", "fake-yawn", "look-away",
    "chest-puff", "come-again", "egg-show-off", "mini-laugh", "back-turn",
  ]);
});

test("random choice never repeats the last two, and every reaction comes up", () => {
  const history = [];
  const seen = new Map();
  for (let i = 0; i < 5000; i++) {
    const next = r.pickReaction(history);
    assert.ok(!history.slice(-r.REACTION_MEMORY).includes(next), `draw ${i} repeated a recent reaction`);
    history.push(next);
    seen.set(next, (seen.get(next) ?? 0) + 1);
  }
  assert.equal(seen.size, 10);
  for (const count of seen.values()) assert.ok(count > 350 && count < 650, `roughly uniform (${count})`);
  assert.equal(r.pickReaction([3, 7], () => 0), 0);
  assert.equal(r.pickReaction([0, 1], () => 0), 2, "the lowest allowed index when random() = 0");
  assert.equal(r.pickReaction([8, 9], () => 0.9999), 7, "the highest allowed index when random() → 1");
});

test("speech bubbles: short, optional, only where written", () => {
  assert.equal(r.pickBubble(3, () => 0), null, "fake yawn never talks");
  assert.equal(r.pickBubble(1, () => 0), "Bitta qo‘lda ham!");
  assert.equal(r.pickBubble(6, () => 0.95), null, "sometimes silent even when it could talk");
  for (const x of r.REACTIONS) for (const line of x.bubbles) assert.ok(line.length <= 22, line);
  assert.ok(r.REACTION_TIMING.bubbleMs >= 800 && r.REACTION_TIMING.bubbleMs <= 1200);
  assert.ok(r.REACTION_TIMING.holdMs >= 200 && r.REACTION_TIMING.holdMs <= 400);
});

test("keeper stages: a save runs hold → reaction → recover → reset; shots only when idle", () => {
  let s = "IDLE";
  for (const [event, expected] of [["shot", "FLIGHT"], ["caught", "CATCH_HOLD"], ["hold-done", "REACTION"], ["reaction-done", "RECOVER"], ["recovered", "RESET"], ["ready", "IDLE"]]) {
    s = r.nextStage(s, event);
    assert.equal(s, expected);
  }
  assert.equal(r.nextStage("REACTION", "skip"), "RECOVER");
  assert.equal(r.nextStage("FLIGHT", "scored"), "RECOVER", "a goal has no taunt");
  assert.equal(r.nextStage("REACTION", "shot"), "REACTION", "no shot can start during a taunt");
  assert.deepEqual(["IDLE", "FLIGHT", "CATCH_HOLD", "REACTION", "RECOVER", "RESET"].filter(r.canShoot), ["IDLE"]);
});
