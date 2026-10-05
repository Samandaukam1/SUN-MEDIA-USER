const test = require("node:test");
const assert = require("node:assert/strict");
const { monotoneEase, SLOWMO_EASE, FLIGHT_EASE, cameraPose, catchVariant } = require("../game-center/games/safi-penalty/cinema.ts");
test("time warps start at 0, end at 1 and never run backwards", () => {
  for (const ease of [SLOWMO_EASE, FLIGHT_EASE, monotoneEase([[0, 0], [0.5, 0.1], [1, 1]])]) {
    assert.ok(Math.abs(ease(0)) < 1e-9 && Math.abs(ease(1) - 1) < 1e-9);
    let last = -1;
    for (let i = 0; i <= 400; i++) { const v = ease(i / 400); assert.ok(v >= last - 1e-9, `non-monotone at ${i}`); last = v; }
  }
});
test("slow motion really is slow near the glove and fast at launch", () => {
  const speed = (a, b) => (SLOWMO_EASE(b) - SLOWMO_EASE(a)) / (b - a);
  assert.ok(speed(0.05, 0.25) > 1.4);
  assert.ok(speed(0.55, 0.85) < 0.7);
  assert.ok(speed(0.55, 0.85) < speed(0.05, 0.25) / 2.5);
});
test("camera keeps its focus point fixed and never shows past the arena", () => {
  const w = 300, h = 336;
  for (const focus of [{ x: 150, y: 168 }, { x: 20, y: 40 }, { x: 290, y: 320 }]) {
    const c = cameraPose(1.12, focus, w, h);
    assert.ok(Math.abs((w / 2 + (focus.x - w / 2) * c.scale + c.x) - focus.x) < 1e-9);
    assert.ok(Math.abs((h / 2 + (focus.y - h / 2) * c.scale + c.y) - focus.y) < 1e-9);
    const left = w / 2 - (w / 2) * c.scale + c.x, right = w / 2 + (w / 2) * c.scale + c.x;
    assert.ok(left <= 1e-9 && right >= w - 1e-9);
  }
});
test("save variants follow the target geometry; a long late dive is a fingertip save", () => {
  assert.equal(catchVariant(8, null), "DOUBLE");
  assert.equal(catchVariant(3, null), "HIGH");
  assert.equal(catchVariant(13, null), "LOW");
  assert.equal(catchVariant(6, null), "DIVING");
  assert.equal(catchVariant(6, "CRITICAL_SAVE"), "FINGERTIP");
});
