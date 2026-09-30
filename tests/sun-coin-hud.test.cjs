/* global __dirname */
const test = require("node:test");
const assert = require("node:assert/strict");
const m = require("../features/sun-coin/coinMotion.ts");
const { rewardReplay, bestValuePackId } = require("../features/sun-coin/types.ts");
const { arenaLayout, keeperBox, keeperDive, KEEPER_FEET } = require("../game-center/games/safi-penalty/physics.ts");

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("a real 3D turn about the vertical axis: rotateY in degrees, no flat 2D spin", () => {
  for (const theta of [0, 0.4, 1.2, Math.PI / 2, 2, 2.9, 3.6, 4.4, 5.5]) {
    const f = m.coinFrame(theta);
    close(f.rotateY, (theta * 180) / Math.PI);
    close(f.depth, Math.sin(theta));
    assert.ok(!("rotate" in f) && !("rotateZ" in f) && !("scaleY" in f));
  }
});

test("face → shaded turn → edge → reverse → face", () => {
  const front = m.coinFrame(0);
  assert.deepEqual([front.frontOpacity, front.backOpacity, front.shade], [1, 0, 0]);
  const edge = m.coinFrame(Math.PI / 2);
  close(edge.shade, 0.55, 1e-9);
  const back = m.coinFrame(Math.PI);
  assert.deepEqual([back.frontOpacity, back.backOpacity], [0, 1]);
  assert.equal(m.coinFrame(2 * Math.PI - 0.01).frontOpacity, 1);
});

test("thickness: metal discs between the faces, evenly spaced and never more than 1.4 px apart", () => {
  for (const size of [18, 26, 48, 84]) {
    const t = size * m.COIN_THICKNESS;
    const z = m.coinLayers(size);
    assert.ok(z.length >= 3 && z.length <= 9);
    assert.ok(z.every((d) => d > -t / 2 && d < t / 2), "strictly between the faces");
    const gap = z[1] - z[0];
    z.slice(1).forEach((d, i) => close(d - z[i], gap, 1e-9));
    if (size <= 84) assert.ok(t / (z.length + 1) <= 1.4 + 1e-9 || z.length === 9);
  }
});

test("the rim is on the coin's own edge (outer diameter = coin diameter), with a small neon halo", () => {
  for (const size of [18, 26, 48, 84]) {
    const g = m.rimGeometry(size);
    close(2 * (g.radius + g.width / 2), size);
    assert.ok(g.bloom <= size * 0.2 || g.bloom <= 3.1, `halo stays controlled at ${size}px`);
  }
});

test("neon runs along the circular rim on its own clock: bright top, medium sides, dim bottom", () => {
  assert.notEqual(m.COIN_ORBIT_MS, m.COIN_SPIN_MS);
  assert.notEqual(m.COIN_SPIN_MS % m.COIN_ORBIT_MS, 0, "not phase-locked to the spin");
  for (let u = 0; u <= 1; u += 0.05) {
    const p = m.rimPoint(u, 40);
    close(Math.hypot(p.x, p.y), 40, 1e-9); // always on the circle, never a square path
  }
  const top = m.rimDepth(0), side = m.rimDepth(0.25), bottom = m.rimDepth(0.5);
  assert.ok(top > side && side > bottom, "top > side > bottom");
  close(top, 1);
  assert.ok(side > 0.5 && side < 0.7 && bottom < 0.3);
});

test("the coin face is a circle cropped to the disc, with the logo on the round face", () => {
  // Same loader as scripts/brand/generate-coin.cjs (the artwork reads the brand geometry JSON).
  const fs = require("node:fs");
  const path = require("node:path");
  const ts = require("typescript");
  const source = path.resolve(__dirname, "../features/sun-coin/coinSvg.ts");
  const js = ts.transpileModule(fs.readFileSync(source, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const mod = {};
  new Function("require", "exports", js)(require("node:module").createRequire(source), mod);
  const svg = mod.sunCoinFaceSvg("t");
  assert.match(svg, /viewBox="7 5 242 242"/, "square viewBox exactly around the r=121 disc");
  assert.doesNotMatch(svg, /<rect[^>]*rx=/, "no rounded-rectangle box behind the logo");
});

test("countdown: server time wins over a wrong device clock, never negative", () => {
  const serverNow = "2026-09-30T10:00:00.000Z";
  const nextFree = "2026-09-30T13:42:18.000Z";
  const deviceNow = Date.parse(serverNow) + 3600_000; // device clock one hour fast
  const offset = m.clockOffset(serverNow, deviceNow);
  assert.equal(m.formatCountdown(m.remainingMs(nextFree, offset, deviceNow)), "03:42:18");
  assert.equal(m.formatCountdown(m.remainingMs(nextFree, 0, deviceNow)), "02:42:18", "without the offset it would be wrong");
  assert.equal(m.formatCountdown(-5000), "00:00:00");
  assert.equal(m.remainingMs(null, 0), 0);
  assert.equal(m.countdownLabel(3 * 3600_000 + 42 * 60_000 + 18_000), "3 soat 43 daqiqa qoldi");
});

const wallet = (balance, freeAvailable, campaignAvailable = true) => ({ balance, campaignAvailable, attempt: { freeAvailable, cost: 10 } });

test("reward replay: free once, then 10 SC with confirmation, or a top-up when short", () => {
  assert.deepEqual(rewardReplay(wallet(0, true)), { kind: "free" });
  assert.deepEqual(rewardReplay(wallet(38, false)), { kind: "paid", cost: 10, balance: 38, after: 28 });
  assert.deepEqual(rewardReplay(wallet(4, false)), { kind: "short", cost: 10, balance: 4, missing: 6 });
  assert.deepEqual(rewardReplay(wallet(10, false)), { kind: "paid", cost: 10, balance: 10, after: 0 });
  assert.deepEqual(rewardReplay(wallet(99, true, false)), { kind: "closed" });
});

test("best value badge only for a genuinely cheaper price per coin", () => {
  const p = (id, coins, priceCents, currency = "USD") => ({ id, coins, priceCents, currency });
  assert.equal(bestValuePackId([p("a", 50, 299), p("b", 100, 499), p("c", 250, 1299)]), "b");
  assert.equal(bestValuePackId([p("a", 50, 250), p("b", 100, 500)]), null, "same rate: no badge");
  assert.equal(bestValuePackId([p("a", 50, 299)]), null);
  assert.equal(bestValuePackId([p("a", 50, 299), p("b", 100, 499, "UZS")]), null, "mixed currencies are not compared");
});

test("goalkeeper stands on the goal line: soles exactly on the ground point", () => {
  const layout = arenaLayout(360);
  const size = 360 * 0.255;
  const box = keeperBox(layout.keeperHome, size);
  close(box.top + KEEPER_FEET * box.height, layout.keeperHome.y);
  assert.ok(layout.keeperHome.y >= layout.ground && layout.keeperHome.y - layout.ground < 10, "on / just in front of the line");
  close(box.left + box.width / 2, layout.width / 2);
});

test("every dive pushes off the ground, never sinks below it, and lands back on it", () => {
  const layout = arenaLayout(360);
  const size = 360 * 0.255;
  for (let zone = 1; zone <= 15; zone++) {
    for (const result of ["GOAL", "CATCH"]) {
      const d = keeperDive(layout, zone, size, result, result === "CATCH" ? zone : (zone % 15) + 1);
      assert.ok(d.reach.y <= layout.keeperHome.y + 1e-9, `zone ${zone}: feet not below the ground`);
      close(d.land.y, layout.keeperHome.y);
      assert.ok(Math.abs(d.landAngle) === (result === "GOAL" ? 92 : Math.abs(d.dir) * 10), `zone ${zone} ${result}: lands ${result === "GOAL" ? "on its side" : "upright"}`);
    }
  }
  const side = keeperDive(layout, 5, size, "CATCH", 5);
  assert.equal(side.dir, 1);
  assert.ok(side.angle > 45, "wide zone: a real sideways dive");
  const centreLow = keeperDive(layout, 13, size, "CATCH", 13);
  assert.equal(centreLow.angle, 0);
});

test("game levels: the app's odds match the server's reach rule", () => {
  const { catchChance, covers, poolSummary } = require("../features/game-admin/levels.ts");
  assert.deepEqual([0, 1, 2, 3].map((r) => Math.round(catchChance(r) * 1000) / 10), [6.7, 17.3, 40.4, 59.1]);
  assert.equal(covers(7, 8, 0), false);
  assert.equal(covers(7, 8, 1), true, "normal: next column, same row");
  assert.equal(covers(7, 12, 1), false);
  assert.equal(covers(7, 12, 2), true, "hard: next row too");
  assert.equal(covers(5, 7, 3), true, "extreme: two columns");
  assert.deepEqual(poolSummary(20, [{ amount: 5, quantity: 2 }, { amount: 3, quantity: 3 }]), { fixed: 19, poolLimited: false, maximum: 19, unallocated: 1, exceeds: false });
  assert.equal(poolSummary(10, [{ amount: 5, quantity: 3 }]).exceeds, true);
});
