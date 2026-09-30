/* global __dirname */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Everything a player's app shows for SAFI Penalty and SUN Coin. (Managers' Game Center control lives in
// features/game-admin and is served only to promo.manage staff by the server.)
const ROOT = path.join(__dirname, "..");
const PLAYER_DIRS = ["game-center", "features/sun-coin", "app/client/games"];

function files(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(path.join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(dir, e.name)] : [],
  );
}
/** Source without comments: explanations for developers may name internal concepts; the app's code may not. */
function code(file) {
  return fs
    .readFileSync(path.join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}
const sources = PLAYER_DIRS.flatMap(files).map((file) => ({ file, text: code(file) }));

test("the player's app has SAFI and SUN Coin sources to check", () => {
  assert.ok(sources.some((s) => s.file.endsWith("SafiPenaltyGame.tsx")));
  assert.ok(sources.some((s) => s.file.endsWith("ModeCards.tsx")));
  assert.ok(sources.length > 15);
});

test("no wording about a maximum score, a limit, a cap or a level ever reaches the player", () => {
  const phrases = [
    /max(imum)?\s*(score|limit|natija|gol)/i,
    /score\s*cap/i,
    /\bcap\b/i,
    /urib\s*bo[‘'ʻ’]?lmaydi/i,
    /osholmaysiz/i,
    /oshira\s*olmaysiz/i,
    /chegara/i,
    /qiyinlik/i,
    /daraja/i,
    /eng\s*ko[‘'ʻ’]?p\s*gol/i,
    /\d+\s*\/\s*10\s*dan/i,
    /\blevel/i,
  ];
  // The checks really catch the messages SUN MEDIA ruled out.
  for (const banned of ["Maximum score: 8/10", "Bu levelda 9 urib bo‘lmaydi", "Score cap", "Maximum limit", "8 dan osholmaysiz"]) {
    assert.ok(phrases.some((p) => p.test(banned)), banned);
  }
  for (const { file, text } of sources) {
    for (const phrase of phrases) assert.doesNotMatch(text, phrase, `${file} says ${phrase}`);
  }
});

test("player code never reads the level, the hidden top result or the reward rules", () => {
  const internals =
    /\b(difficulty|reach_snapshot|game_center_settings|targetScore|target_score|minScore|maxScore|minimumScore|goalChance|saveChance|get_sun_coin_admin_dashboard|game_reward_\w+|rewardCampaigns|set_game_center_difficulty)\b/;
  for (const { file, text } of sources) {
    assert.doesNotMatch(text, internals, file);
    assert.doesNotMatch(text, /features\/game-admin/, `${file} imports the managers' control`);
  }
});

test("the only prize text before a round names kinds of prize — and after it, only what was won", () => {
  const cards = sources.find((s) => s.file.endsWith("ModeCards.tsx")).text;
  assert.match(cards, /prizeTeaser\(wallet\.rewardKinds\)/);
  const game = sources.find((s) => s.file.endsWith("SafiPenaltyGame.tsx")).text;
  assert.match(game, /SUN COIN/);
  assert.match(game, /KUN PRO/);
  assert.match(game, /URINISH/);
  assert.match(game, /GOL/);
  assert.doesNotMatch(game, /claimReward|Uch qutidan/, "no prize boxes: the server has decided");
});
