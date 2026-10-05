import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { useEffect, useMemo, useRef } from "react";
import type { AudioChannel, GamePreferences } from "./preferences";
import { channelGain } from "./preferences";
import type { GameFeedback, GamePhase, SoundEvent } from "./types";

const ASSETS = {
  lobby: require("../../assets/games/safi/audio/lobby.mp3"), round: require("../../assets/games/safi/audio/round.mp3"),
  final: require("../../assets/games/safi/audio/final.mp3"), result: require("../../assets/games/safi/audio/result.mp3"),
  loss: require("../../assets/games/safi/audio/loss.mp3"),
  crowd: require("../../assets/games/safi/audio/crowd.mp3"),
  kick: [require("../../assets/games/safi/audio/kick0.mp3"), require("../../assets/games/safi/audio/kick1.mp3"), require("../../assets/games/safi/audio/kick2.mp3")],
  catch: [require("../../assets/games/safi/audio/catch0.mp3"), require("../../assets/games/safi/audio/catch1.mp3"), require("../../assets/games/safi/audio/catch2.mp3")],
  break: [require("../../assets/games/safi/audio/break0.mp3"), require("../../assets/games/safi/audio/break1.mp3"), require("../../assets/games/safi/audio/break2.mp3")],
  cluck: [require("../../assets/games/safi/audio/cluck0.mp3"), require("../../assets/games/safi/audio/cluck1.mp3"), require("../../assets/games/safi/audio/cluck2.mp3")],
  frustrated: [require("../../assets/games/safi/audio/frustrated0.mp3"), require("../../assets/games/safi/audio/frustrated1.mp3"), require("../../assets/games/safi/audio/frustrated2.mp3")],
  cheer: [require("../../assets/games/safi/audio/cheer0.mp3"), require("../../assets/games/safi/audio/cheer1.mp3"), require("../../assets/games/safi/audio/cheer2.mp3")],
  whoosh: require("../../assets/games/safi/audio/whoosh.mp3"), near: require("../../assets/games/safi/audio/near.mp3"),
  tip: require("../../assets/games/safi/audio/tip0.mp3"), pulse: require("../../assets/games/safi/audio/pulse.mp3"),
  critical: require("../../assets/games/safi/audio/critical.mp3"), landing: require("../../assets/games/safi/audio/landing.mp3"),
  slide: require("../../assets/games/safi/audio/slide.mp3"), ui: require("../../assets/games/safi/audio/ui.mp3"),
  reward: require("../../assets/games/safi/audio/reward.mp3"), achievement: require("../../assets/games/safi/audio/achievement.mp3"),
  combo: require("../../assets/games/safi/audio/combo.mp3"), hot: require("../../assets/games/safi/audio/hot.mp3"),
};
type Entry = { player: AudioPlayer; channel: AudioChannel; loop: boolean; factor: number; share: number };
type Music = "lobby" | "round" | "final" | "result" | "loss";
/** How loud one-shots sit against their channel (UI sits under gameplay effects). */
const SHARE: Partial<Record<number, number>> = { [ASSETS.ui]: 0.65, [ASSETS.pulse]: 0.7, [ASSETS.whoosh]: 0.85 };

/**
 * Owns every player/timer. Music crossfades and the music/crowd "bed" ducks without React frame updates:
 * a single 30 ms ramp timer runs only while some level is still moving.
 */
class GameAudio {
  private entries = new Map<number, Entry>();
  private last = new Map<string, number>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private fade: ReturnType<typeof setInterval> | null = null;
  private ramp: ReturnType<typeof setInterval> | null = null;
  private release: ReturnType<typeof setTimeout> | null = null;
  private now = { music: 1, crowd: 1, gate: 0 };
  private target = { music: 1, crowd: 1, gate: 0 };
  private active = false;
  private disposed = false;
  private music: Music = "lobby";
  constructor(private preferences: GamePreferences) {
    // Critical effects begin loading with the arena; unused variants load on demand.
    [ASSETS.kick[0], ASSETS.catch[0], ASSETS.break[0], ASSETS.whoosh, ASSETS.lobby, ASSETS.crowd].forEach((id) =>
      this.entry(id, id === ASSETS.lobby ? "music" : id === ASSETS.crowd ? "crowd" : "sfx", id === ASSETS.lobby || id === ASSETS.crowd));
    void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: false, interruptionMode: "mixWithOthers" }).catch(() => undefined);
  }
  private entry(id: number, channel: AudioChannel, loop = false) {
    let e = this.entries.get(id);
    if (!e) {
      const player = createAudioPlayer(id, { updateInterval: 1000 });
      player.loop = loop;
      player.volume = 0;
      e = { player, channel, loop, factor: loop ? 0 : 1, share: SHARE[id] ?? 1 };
      this.entries.set(id, e);
    }
    return e;
  }
  private mix() {
    for (const e of this.entries.values()) {
      const bed = e.channel === "crowd" ? this.now.crowd : this.now.music;
      e.player.volume = channelGain(this.preferences, e.channel, bed) * e.factor * this.now.gate * e.share;
    }
  }
  /** Ease the bed levels (and the master gate) towards their targets; stops itself when they arrive. */
  private move() {
    if (this.ramp || this.disposed) return;
    this.ramp = setInterval(() => {
      let moving = false;
      for (const key of ["music", "crowd", "gate"] as const) {
        const goal = this.target[key];
        const diff = goal - this.now[key];
        if (Math.abs(diff) < 0.01) { this.now[key] = goal; continue; }
        // Quick to duck, slow to come back: contrast without pumping.
        this.now[key] += diff * (diff < 0 ? 0.32 : 0.09);
        moving = true;
      }
      this.mix();
      if (!this.active && this.now.gate <= 0.01) this.entries.forEach((e) => e.player.pause());
      if (!moving && this.ramp) { clearInterval(this.ramp); this.ramp = null; }
    }, 30);
  }
  /** Lower the music and crowd for `holdMs`, then let them swell back. `holdMs` 0 holds until `unduck`. */
  private duck(music: number, crowd: number, holdMs: number) {
    this.target.music = music;
    this.target.crowd = crowd;
    if (this.release) clearTimeout(this.release);
    this.release = holdMs > 0 ? setTimeout(() => this.unduck(), holdMs) : setTimeout(() => this.unduck(), 5000);
    this.move();
  }
  private unduck() {
    if (this.release) clearTimeout(this.release);
    this.release = null;
    this.target.music = 1;
    this.target.crowd = 1;
    this.move();
  }
  update(p: GamePreferences) { this.preferences = p; this.mix(); }
  scene(music: Music, active: boolean) {
    if (this.disposed) return;
    this.music = music;
    this.active = active;
    this.target.gate = active ? 1 : 0;
    if (this.fade) clearInterval(this.fade);
    if (!active) {
      this.timers.forEach(clearTimeout); this.timers.clear();
      this.move();
      return;
    }
    const score = this.entry(ASSETS[music], "music", true);
    const crowd = this.entry(ASSETS.crowd, "crowd", true);
    const from = new Map([...this.entries.values()].map((e) => [e, e.factor]));
    score.player.play(); crowd.player.play();
    let n = 0;
    // Music crossfades over ~0.7 s; the crowd bed never restarts.
    this.fade = setInterval(() => {
      n++;
      for (const e of this.entries.values()) {
        if (!e.loop) continue;
        const target = e === score || e === crowd ? 1 : 0;
        e.factor = (from.get(e) ?? 0) + (target - (from.get(e) ?? 0)) * Math.min(1, n / 24);
        if (n >= 24 && !target) e.player.pause();
      }
      this.mix();
      if (n >= 24 && this.fade) { clearInterval(this.fade); this.fade = null; }
    }, 30);
    this.move();
  }
  private choose(key: "kick" | "catch" | "break" | "cluck" | "frustrated" | "cheer") {
    const options = ASSETS[key].filter((_, i) => i !== this.last.get(key));
    const id = options[Math.floor(Math.random() * options.length)];
    this.last.set(key, ASSETS[key].indexOf(id));
    return id;
  }
  private effect(id: number, channel: AudioChannel = "sfx") {
    if (this.disposed || !this.active || !channelGain(this.preferences, channel)) return;
    const e = this.entry(id, channel);
    e.player.volume = channelGain(this.preferences, channel) * e.share * this.now.gate;
    void e.player.seekTo(0).then(() => { if (!this.disposed && this.active && channelGain(this.preferences, channel)) e.player.play(); }).catch(() => undefined);
  }
  private after(ms: number, fn: () => void) {
    const t = setTimeout(() => { this.timers.delete(t); if (!this.disposed && this.active) fn(); }, ms);
    this.timers.add(t);
  }
  sound = (event: SoundEvent) => {
    if (!this.active || this.disposed) return;
    // The score yields to what matters: a short duck for most effects, silence around the contact itself.
    if (event === "shot") { this.effect(this.choose("kick")); this.after(70, () => this.effect(ASSETS.whoosh)); this.duck(0.6, 0.55, 700); }
    else if (event === "tension") { this.duck(0.42, 0.3, 0); }
    else if (event === "release") { this.unduck(); }
    else if (event === "slowmo") { this.duck(0.22, 0.2, 1200); this.after(60, () => this.effect(ASSETS.pulse)); }
    else if (event === "catch") {
      this.duck(0.18, 0.1, 380);
      this.effect(this.choose("catch")); this.after(380, () => this.effect(this.choose("cluck"), "chicken")); this.after(240, () => this.effect(ASSETS.landing));
      this.after(420, () => this.effect(this.choose("cheer"), "crowd"));
    } else if (event === "fingertip") {
      this.duck(0.18, 0.1, 420);
      this.effect(ASSETS.tip); this.after(90, () => this.effect(ASSETS.critical)); this.after(520, () => this.effect(this.choose("cluck"), "chicken"));
    } else if (event === "goal") {
      this.duck(0.2, 0.12, 360);
      this.after(360, () => this.effect(this.choose("cheer"), "crowd")); this.after(520, () => this.effect(this.choose("frustrated"), "chicken")); this.after(300, () => this.effect(ASSETS.landing)); this.after(560, () => this.effect(ASSETS.slide));
    } else if (event === "eggBreak") { this.effect(this.choose("break")); }
    else if (event === "nearMiss") { this.effect(ASSETS.near, "crowd"); }
    else if (event === "criticalSave") { this.effect(ASSETS.critical); }
    else if (event === "luckyEgg") { this.effect(ASSETS.reward); }
    else if (event === "bossEntrance") { this.effect(ASSETS.hot); this.effect(this.choose("cheer"), "crowd"); }
    else if (event === "taunt") { this.effect(this.choose("cluck"), "chicken"); }
    else if (event === "combo") { this.effect(ASSETS.combo); }
    else if (event === "hotStreak") { this.effect(ASSETS.hot); }
    else if (event === "achievement" || event === "personalBest") { this.effect(ASSETS.achievement); this.duck(0.5, 0.5, 900); }
    else if (event === "reward" || event === "shopPurchase") { this.effect(ASSETS.reward); this.duck(0.5, 0.5, 900); }
    else { this.effect(ASSETS.ui); }
  };
  dispose() {
    this.disposed = true;
    if (this.fade) clearInterval(this.fade);
    if (this.ramp) clearInterval(this.ramp);
    if (this.release) clearTimeout(this.release);
    this.timers.forEach(clearTimeout);
    this.entries.forEach((e) => { e.player.pause(); e.player.release(); });
    this.entries.clear();
  }
}

/** `won`: undefined while playing, then whether the finished round scored well (picks the result cue). */
export function useGameAudio(p: GamePreferences, phase: GamePhase, used: number, active: boolean, loaded: boolean, external?: GameFeedback, won?: boolean): GameFeedback {
  const mixer = useRef<GameAudio | null>(null);
  const music: Music = phase === "FINISHED" ? (won === false ? "loss" : "result") : phase === "IDLE" || phase === "STARTING" ? "lobby" : used >= 7 ? "final" : "round";
  useEffect(() => {
    if (!loaded) return;
    const instance = new GameAudio(p);
    mixer.current = instance;
    return () => { instance.dispose(); mixer.current = null; };
    // Preferences are synchronized below; the mixer is owned by the mounted game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);
  useEffect(() => { mixer.current?.update(p); }, [p]);
  useEffect(() => { mixer.current?.scene(music, active); }, [music, active, loaded]);
  return useMemo(() => ({
    soundEnabled: loaded && p.master && active, hapticsEnabled: loaded && p.haptics && active,
    onSound: (event: SoundEvent) => { mixer.current?.sound(event); if (external?.soundEnabled) external.onSound?.(event); },
  }), [loaded, p.master, p.haptics, active, external]);
}
