# Game Center / SAFI Penalty

Client entry: Account → Game Center → SAFI Penalty. Free, Pro, trial and promo users share the same access. Existing client route guards are unchanged. Staff never receive an entry, and every game RPC independently verifies an active client account. SAFI campaign deep links redirect into the same module. WeDrink is registered as coming soon.

## Integration

`game-center/GameCenterScreen.tsx` renders the registry. `SafiPenaltyGame` accepts an optional `GameTransport`, `onBack`, and optional globally controlled `GameFeedback` sound adapter. The default transport uses authenticated Supabase RPCs. No new package dependencies.

`GameSession` is a UI-independent controller exposing `startGame()`, `submitShot(zone)`, `getGameState()`, `finishGame()`, `claimReward(box)`, `retry()` and a subscription. The renderer drives `beginReset()` / `completeReset()` after animation completion. A future game can supply its renderer and server protocol through the same transport interface. `game_key`, score, client, user and timestamps on the existing session records support future daily/weekly leaderboards; no public leaderboard or extra social tables are introduced.

Public shot zones are **1–15**, three rows and five columns. Legacy database `zone` storage remains 0–14; conversion happens only inside the new shot RPC. Ten shots are fixed for SAFI. Compatible reward campaigns use template `penalty`, 10 attempts and a target score ≤10. Other configurations do not silently weaken reward thresholds; SAFI remains playable in practice mode.

## Server protocol

The ADMIN repository owns `supabase/migrations/20260930101100_game_center.sql` and `supabase/tests/database/026_game_center.test.sql`.

- `game_center_start(game_key, request)` resumes an open round or starts one, snapshots the reward opportunity, and returns only public session state. No Pro requirement.
- `game_center_shoot(session, request, n, zone)` locks the session, validates ownership/expiry/sequence/zone, draws the keeper **after** the submitted choice, records the result and calculates the score. A catch is the same zone; a different zone is a goal. No keeper information is sent before a shot. Unique request IDs and sequence numbers prevent duplicate acceptance. Retrying the same request returns its original response, even after completion. Reusing its key for a different zone is rejected.
- `game_center_finish(session)` requires all ten attempts, recomputes the score from records and returns an idempotent result. It decides whether boxes are available.
- `game_center_claim(session, box)` delegates to the existing `game_open_box` and `private.extend_workspace_plan` path. No second subscription system. One reward per session; an existing Pro expiry is extended.

Existing session, attempt, campaign and reward tables are reused. Campaign IDs may be null for permanent practice sessions. Private reward-draw fields cannot be read through the session table by players. Managers retain their existing read access. Legacy attempt/finish RPCs reject new-protocol sessions, preventing bypass of the new rules.

Daily limits, cooldown, maximum wins, inactive/no campaigns and exhausted stock affect **rewards only**. Practice sessions do not consume additional reward opportunities or extend reward cooldown. They still use the server; offline play is deliberately unavailable. A transport failure retains the same request and the selected zone, keeps the other targets locked, shows a retry action, and never invents a result. Reloading resumes server score and attempt count.

## Artwork, motion and accessibility

The original 2462×2462 SAFI logo is copied byte-for-byte into `assets/games/safi/logo-original.png`. Green `#70BC22` and charcoal `#222224` were sampled from its dominant opaque pixels. Both logo theme variants reference the original; no tint, distortion or effects. Supporting colors live in `safiTheme`. Chicken, gloves, egg, field and splatter are original SVG artwork.

Native `Animated` transforms/opacity run with the native driver. React updates on gameplay transitions, not on animation frames. The web preview uses Animated's web implementation. Egg flight follows a sampled arc, the goalkeeper uses the same normalized goal coordinates, a caught egg stops at the glove area, and a goal produces shell/white/yolk splatter plus a miss/landing/recovery. Score changes have a brief native-driver pulse. Animation loops clean up when phases change/unmount. Reduced Motion disables idle/anticipation and shortens travel; haptics are suppressed. Sound hooks are optional and disabled unless a host explicitly enables them.

The goal aspect ratio is constant; touch targets derive from measured bounds. At a 320-point viewport every target is at least 44×44 points. All targets have unique Uzbek accessibility labels, keyboard focus, and disabled states. Native top/bottom safe areas and scrolling protect controls. App orientation remains the existing portrait setting.

## Verification (2026-09-30)

- USER: TypeScript, ESLint, 43 tests pass (12 Game Center tests).
- ADMIN: TypeScript passes; all 26 database suites / 729 assertions passed, including 54 new game assertions. Targeted tests verify actual Free/Pro entitlements, exact Pro extension, all reward-limit practice modes, server scoring, retries, invalid zones, ownership, privacy, legacy bypass rejection, ten-shot cap and duplicate rewards.
- Local database advisors: no new game findings. Hosted advisors flag the four authenticated SECURITY DEFINER RPCs, which is intentional: each enforces client authorization/ownership and writes server-owned game records; anonymous execution is revoked. See [Supabase advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Existing permissive-policy notices are in unrelated chat/subscription tables. Existing SQL lint warnings are in Meta lead functions; no game warnings remain.
- Web production export succeeds. Browser QA observed top-left/top-right/center/bottom-left/bottom-right, catch, goal, shell/yolk break, miss/fall, reset, 10/10 result, replay at 0/10, and reload resuming the server round.
- iPhone 17, iOS 26.4 Simulator: native app launches; Game Center and SAFI arena render correctly with Dynamic Island clearance. Screenshot: `docs/qa/safi-iphone17.png`. Full native touch/animation QA was not completed because Device Hub accessibility timed out. Physical USB iPhone was not available. Android hardware, physical haptics and sustained FPS were not measured. 60 FPS is a design target, not a measured claim.

The local schema was tested using SQL before recording the reviewed migration. `supabase db pull --local` was attempted but its Docker image pull stalled; the tested migration was retained and local history synchronized explicitly. The migration is deployed to the existing Sun Media Supabase project. A rolled-back hosted smoke test verified session start, valid keeper zones, private pre-shot data, authoritative scoring and identical retry responses. Migration history is aligned to `20260930101100` (after the existing game migrations). No reward campaign is automatically created or funded.
