const test = require("node:test");
const assert = require("node:assert/strict");
const { advancePresentation, classifyShotMoment, INITIAL_PRESENTATION } = require("../game-center/games/safi-penalty/presentation.ts");

const shot = (result, selectedZone, goalkeeperZone = 8) => ({
  attemptId: "shot", sessionId: "session", attempt: 1, selectedZone,
  goalkeeperZone, result, score: result === "GOAL" ? 1 : 0, attempts: 10,
});

test("combo and chicken mood follow only server shot outcomes and reset on saves", () => {
  let p = INITIAL_PRESENTATION;
  p = advancePresentation(p, shot("GOAL", 7));
  p = advancePresentation(p, shot("GOAL", 7));
  assert.equal(p.combo, 2);
  assert.equal(p.mood, "NERVOUS");
  p = advancePresentation(p, shot("GOAL", 7));
  assert.equal(p.mood, "FRUSTRATED");
  p = advancePresentation(p, shot("CATCH", 8));
  assert.equal(p.combo, 0);
  p = advancePresentation(p, shot("CATCH", 8));
  p = advancePresentation(p, shot("CATCH", 8));
  assert.equal(p.mood, "SMUG");
});

test("near miss requires a goal close to the actual glove, critical save requires a long dive", () => {
  assert.equal(classifyShotMoment(shot("GOAL", 7), 343), "NEAR_MISS");
  assert.equal(classifyShotMoment(shot("GOAL", 1), 343), null);
  assert.equal(classifyShotMoment(shot("CATCH", 8), 343), null);
  assert.equal(classifyShotMoment(shot("CATCH", 1, 1), 343), "CRITICAL_SAVE");
});
