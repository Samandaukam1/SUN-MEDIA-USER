const test = require("node:test");
const assert = require("node:assert/strict");
const { readPreferences, channelGain } = require("../game-center/engine/preferences.ts");
const { arenaLayout, zonePoint, keeperDive, diveGloveOffset } = require("../game-center/games/safi-penalty/physics.ts");
test("master mute preserves channel preferences, all channels mute and music ducks by 65%", () => {
  const p = readPreferences({ master: false, channels: { music: { volume: 67 }, chicken: { enabled: false, volume: 80 } } });
  for (const c of ["music", "sfx", "crowd", "chicken"]) assert.equal(channelGain(p, c), 0);
  p.master = true;
  assert.equal(channelGain(p, "music"), .67);
  assert.ok(Math.abs(channelGain(p, "music", .35) - .67 * .35) < 1e-10);
  assert.equal(channelGain(p, "chicken"), 0);
  assert.equal(p.channels.chicken.volume, 80);
});
test("corrupt stored settings normalize safely, volumes remain within 0–100", () => {
  assert.equal(readPreferences(null).channels.music.volume, 42);
  const p = readPreferences({ master: "false", masterVolume: Infinity, channels: { music: { volume: -20 }, sfx: { volume: 200 }, crowd: { volume: NaN } } });
  assert.equal(p.master, true); assert.equal(p.masterVolume, 100);
  assert.equal(p.channels.music.volume, 0); assert.equal(p.channels.sfx.volume, 100); assert.equal(p.channels.crowd.volume, 20);
});
test("all 15 catch targets meet the visible glove palm at different screen sizes", () => {
  for (const width of [288,343,480]) {
    const layout = arenaLayout(width);
    for (let zone = 1; zone <= 15; zone++) {
      const d = keeperDive(layout, zone, width * .255, "CATCH", zone);
      const palm = diveGloveOffset(width * .255, d.angle, d.hand);
      const target = zonePoint(zone, layout.goal);
      assert.ok(Math.hypot(d.reach.x + palm.x - target.x, d.reach.y + palm.y - target.y) < 1, `${width}px zone ${zone}`);
      assert.ok(d.reach.y <= layout.keeperHome.y);
    }
  }
});

test("goals cross the selected front plane and continue to recessed net; catches stop on the palm plane", () => {
  const { eggFlight, goalImpactPoint } = require("../game-center/games/safi-penalty/physics.ts");
  for (const width of [288,343,480]) {
    const layout = arenaLayout(width);
    for (let zone = 1; zone <= 15; zone++) {
      const front = zonePoint(zone, layout.goal);
      assert.deepEqual(eggFlight(layout.shooter,front,layout.goal,.83,30,true),front);
      const impact = goalImpactPoint(front,layout.goal);
      const end = eggFlight(layout.shooter,front,layout.goal,1,30,true);
      assert.ok(Math.hypot(end.x-impact.x,end.y-impact.y)<1e-8);
      assert.ok(impact.y < front.y && impact.y > layout.goal.y);
      const catchEnd = eggFlight(layout.shooter,front,layout.goal,1,30,false);
      assert.ok(Math.hypot(catchEnd.x-front.x,catchEnd.y-front.y)<1e-8);
    }
  }
});
