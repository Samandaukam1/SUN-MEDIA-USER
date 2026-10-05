const test = require("node:test");
const assert = require("node:assert/strict");
const r = require("../game-center/games/safi-penalty/reactions.ts");
const tl = require("../game-center/games/safi-penalty/keeper/timelines.ts");
const t3 = require("../game-center/games/safi-penalty/keeper/turn3d.ts");

test("reaction pools: 12 happy, 10 angry, at least 20 idle moves and taunts — all unique", () => {
  assert.equal(r.HAPPY_REACTIONS.length, 12);
  assert.equal(r.ANGRY_REACTIONS.length, 10);
  assert.ok(r.IDLE_MICRO.length + r.IDLE_TAUNTS.length >= 20);
  assert.equal(r.IDLE_TAUNTS.length, 4);
  for (const pool of [r.HAPPY_REACTIONS.map((x) => x.id), r.ANGRY_REACTIONS.map((x) => x.id), [...r.IDLE_MICRO], r.IDLE_TAUNTS.map((x) => x.id)]) {
    assert.equal(new Set(pool).size, pool.length);
  }
  for (const id of ["come-come", "one-hand-hold", "eyes-closed", "laugh-with-egg", "show-egg", "turn-back", "glove-clap", "look-at-egg"]) {
    assert.ok(r.HAPPY_REACTIONS.some((x) => x.id === id), id);
  }
  for (const id of ["back-turn", "come-come", "one-hand", "eyes-closed"]) assert.ok(r.IDLE_TAUNTS.some((x) => x.id === id), id);
});

test("every catalogue entry has a timeline, and every timeline is well-formed", () => {
  const joints = new Set(tl.JOINTS);
  const faces = new Set(tl.FACES);
  const check = (name, t, min, max) => {
    assert.ok(t, `${name} has a timeline`);
    assert.ok(t.duration >= min && t.duration <= max, `${name}: ${t.duration} ms within ${min}–${max}`);
    for (const [joint, keys] of Object.entries(t.tracks)) {
      assert.ok(joints.has(joint), `${name}: unknown joint ${joint}`);
      keys.forEach(([at, value], i) => {
        assert.ok(Number.isFinite(at) && Number.isFinite(value), `${name}.${joint}: finite keys`);
        if (i > 0) assert.ok(at >= keys[i - 1][0], `${name}.${joint}: keys in time order`);
        assert.ok(at <= t.duration + 250, `${name}.${joint}: key at ${at} ms inside the timeline`);
      });
    }
    for (const [, f] of t.faces ?? []) assert.ok(faces.has(f), `${name}: face ${f}`);
  };
  r.HAPPY_REACTIONS.forEach((x) => check(`happy ${x.id}`, tl.HAPPY_TIMELINES[x.id], 600, 1400));
  r.ANGRY_REACTIONS.forEach((x) => check(`angry ${x.id}`, tl.ANGRY_TIMELINES[x.id], 600, 1400));
  r.IDLE_MICRO.forEach((id) => check(`micro ${id}`, tl.IDLE_MICRO_TIMELINES[id], 400, 1400));
  r.IDLE_TAUNTS.forEach((x) => check(`taunt ${x.id}`, tl.IDLE_TAUNT_TIMELINES[x.id], 1600, 3000));
});

test("turns are real turns: all the way round to the back and home again, always facing the player at the end", () => {
  const all = { ...tl.HAPPY_TIMELINES, ...tl.ANGRY_TIMELINES, ...tl.IDLE_TAUNT_TIMELINES, ...tl.IDLE_MICRO_TIMELINES };
  for (const [id, t] of Object.entries(all)) {
    for (const joint of ["yaw", "headYaw"]) {
      const keys = t.tracks[joint];
      if (!keys) continue;
      assert.equal(keys[keys.length - 1][1], 0, `${id}.${joint} ends facing the player`);
      // One way round (face to the right), so the arms and the tail pass behind the body on the correct side.
      if (joint === "yaw") assert.ok(keys.every(([, v]) => v >= -15 && v <= 180), `${id}.yaw within −15…180`);
    }
  }
  for (const id of ["back-turn"]) assert.ok(tl.IDLE_TAUNT_TIMELINES[id].tracks.yaw.some(([, v]) => v === 180), `${id} shows the back`);
  for (const id of ["turn-back"]) assert.ok(tl.HAPPY_TIMELINES[id].tracks.yaw.some(([, v]) => v === 180), `${id} shows the back`);
  assert.ok(tl.ANGRY_TIMELINES["turn-away"].tracks.yaw.some(([, v]) => v === 180));
  // A "no" is a shake of the head from side to side.
  assert.ok(tl.HAPPY_TIMELINES["head-shake-no"].tracks.headYaw.filter(([, v]) => Math.abs(v) >= 18).length >= 4);
  const laugh = tl.HAPPY_TIMELINES["laugh-with-egg"];
  assert.equal(laugh.faces[0][1], "LAUGH");
  assert.ok(laugh.tracks.headRot.some(([, v]) => v <= -10), "head tips back");
  assert.ok(laugh.tracks.bodyY.length >= 6, "the body bounces");
  assert.ok(laugh.tracks.puff, "the chest moves");
  const beckon = tl.HAPPY_TIMELINES["come-come"];
  const curls = beckon.tracks.rIdx.map(([, v]) => v);
  assert.ok(curls.filter((v) => v >= 0.9).length >= 3 && curls.filter((v) => v <= 0.1).length >= 3, "fingers curl in and out repeatedly");
});

test("poses cover every joint; the save pose closes the fingers on the egg", () => {
  for (const [name, pose] of Object.entries(tl.BASES)) {
    for (const j of tl.JOINTS) assert.ok(Number.isFinite(pose[j]), `${name}.${j}`);
    assert.equal(pose.yaw, 0, `${name} faces the player`);
    assert.equal(pose.headYaw, 0, `${name} looks at the player`);
  }
  assert.ok(tl.HOLD.lIdx >= 0.4 && tl.HOLD.lMid >= 0.4, "fingers closed round the egg");
  assert.ok(tl.DIVE.lSh > 150 && tl.DIVE.rSh > 150, "arms fully stretched for the dive");
});

test("random picks never repeat the last two in any pool; idle beats come every 2.5–6 s", () => {
  for (const size of [12, 10, 11, 4]) {
    const history = [];
    for (let i = 0; i < 3000; i++) {
      const next = r.pickFrom(size, history);
      assert.ok(!history.slice(-r.REACTION_MEMORY).includes(next));
      history.push(next);
    }
    assert.equal(new Set(history).size, size);
  }
  assert.equal(r.nextIdleDelay(() => 0), 2500);
  assert.equal(r.nextIdleDelay(() => 1), 6000);
  assert.ok(r.TAUNT_SHARE > 0 && r.TAUNT_SHARE < 0.5, "most idle beats are small moves");
});

test("speech bubbles: short, optional, never insulting", () => {
  assert.equal(r.pickBubble(8, () => 0), null, "fake yawn never talks");
  assert.equal(r.pickBubble(1, () => 0), "Bitta qo‘lda ham!");
  assert.equal(r.pickBubble(3, () => 0.99), null, "sometimes silent even when it could talk");
  for (const pool of [r.HAPPY_REACTIONS, r.ANGRY_REACTIONS, r.IDLE_TAUNTS]) for (const x of pool) for (const line of x.bubbles) assert.ok(line.length <= 22, line);
});

test("state machine: save and goal paths, shots only while idle or taunting, skip only during reactions", () => {
  const walk = (events) => events.reduce((s, e) => r.nextStage(s, e), "IDLE");
  assert.equal(walk(["shot", "focused", "caught", "secured", "hold-done"]), "HAPPY_REACTION");
  assert.equal(walk(["shot", "focused", "scored", "fell", "hold-done"]), "ANGRY_REACTION");
  assert.equal(walk(["taunt", "shot"]), "FOCUS", "a shot interrupts a taunt at once");
  assert.equal(walk(["shot", "focused", "caught", "secured", "hold-done", "reaction-done", "recovered", "ready"]), "IDLE");
  assert.equal(r.nextStage("HAPPY_REACTION", "shot"), "HAPPY_REACTION", "no shot during a reaction");
  const all = ["IDLE", "IDLE_TAUNT", "READY", "FOCUS", "DIVE", "CATCH", "CATCH_HOLD", "HAPPY_REACTION", "MISS", "FALL", "ANGRY_REACTION", "RECOVER", "RESET"];
  assert.deepEqual(all.filter(r.canShoot), ["IDLE", "IDLE_TAUNT", "READY"]);
  assert.deepEqual(all.filter(r.canSkip), ["HAPPY_REACTION", "ANGRY_REACTION"]);
});

test("3D turn: round parts stay round, the face slides round the head and hides behind it", () => {
  const at = (track, deg) => track[t3.YAW_GRID.indexOf(deg)];
  const body = { cx: t3.AXIS_X, cz: 0, a: 42, b: 36 };
  const outline = t3.outlineTrack(body);
  // Never a flat card: the body keeps most of its width in profile instead of collapsing to a line.
  assert.ok(Math.min(...outline.scale) >= 0.85, "the body outline never collapses");
  assert.equal(at(outline.scale, 0), 1);
  assert.equal(at(outline.scale, 180), 1);

  const face = t3.surfaceTrack({ cx: t3.AXIS_X, cz: 0, a: 28, b: 27 }, 0, 0);
  assert.deepEqual([at(face.shift, 0), at(face.scale, 0), at(face.opacity, 0)], [0, 1, 1], "front view as drawn");
  assert.ok(at(face.shift, 45) > 15 && at(face.shift, 90) > at(face.shift, 45), "turning right, the face slides right");
  assert.ok(at(face.scale, 60) < 0.6, "and narrows toward the edge");
  assert.equal(at(face.opacity, 120), 0, "then hides behind the head");
  assert.equal(at(face.opacity, 180), 0);

  const shirtNumber = t3.surfaceTrack(body, 180, 0, 180);
  assert.equal(at(shirtNumber.opacity, 0), 0, "the number is on the back");
  assert.deepEqual([at(shirtNumber.shift, 180), at(shirtNumber.scale, 180), at(shirtNumber.opacity, 180)], [0, 1, 1]);

  // The beak's side grows as the head turns, pointing where the face looks.
  const side = t3.profileScale();
  assert.ok(at(side, 90) > 0.99 && at(side, -90) < -0.99 && Math.abs(at(side, 0)) <= 0.01);
  assert.equal(at(t3.profileOpacity(), 0), 0);
  assert.equal(at(t3.profileOpacity(), 90), 1);
  assert.deepEqual([90, 110, 180].map((d) => t3.stepValue(t3.profileVisible(), d)), [1, 0, 0], "hidden once behind the head");
});

test("3D turn: the far arm and the tail change sides of the body, the gloves show their backs", () => {
  const at = (track, deg) => (Array.isArray(track) ? track[t3.YAW_GRID.indexOf(deg)] : t3.stepValue(track, deg));
  const left = t3.armBehind(80);
  const right = t3.behind(28, 10, 4);
  assert.deepEqual([at(left, 0), at(right, 0)], [0, 0], "front view: both arms in front");
  assert.deepEqual([at(left, 90), at(right, 90)], [0, 1], "profile: the near arm in front, the far arm behind");
  assert.deepEqual([at(left, 180), at(right, 180)], [1, 1], "back view: both behind the body");
  const tail = t3.behind(32, -20);
  assert.equal(at(tail, 0), 1, "the tail is behind the body from the front");
  assert.equal(at(tail, 180), 0, "and in front of it from behind");
  const tailDir = t3.directionScale(0.75, -0.66);
  assert.ok(at(tailDir, 0) === 1 && at(tailDir, 180) < -0.9, "the tail points the other way once turned");
  const glove = t3.backSide();
  assert.deepEqual([at(glove, 0), at(glove, 90), at(glove, 180)], [0, 0, 1]);
  // The near arm's plane lags the body and is never edge-on while it is in front of the body.
  for (let d = 0; d <= 180; d++) {
    if (t3.stepValue(left, d) === 0) assert.ok(Math.abs(Math.cos((t3.armAngle(d) * Math.PI) / 180)) >= 0.17, `arm plane at ${d}°`);
  }
  assert.equal(t3.armAngle(0), 0);
  assert.equal(t3.armAngle(180), 180);
  // Layer switches are instant (no see-through cross-fade).
  for (const st of [left, right, tail, glove]) {
    for (let i = 1; i < st.input.length; i++) if (st.output[i] !== st.output[i - 1]) assert.ok(st.input[i] - st.input[i - 1] <= 0.25);
  }
  assert.ok(t3.YAW_GRID.every((d) => Number.isFinite(at(t3.directionScale(1, 0), d)) && Math.abs(at(t3.directionScale(1, 0), d)) >= 0.01), "no zero scale");
});
