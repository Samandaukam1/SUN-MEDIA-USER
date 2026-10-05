import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { useEffect, useMemo, useRef } from "react";
import type { AudioChannel, GamePreferences } from "./preferences";
import { channelGain } from "./preferences";
import type { GameFeedback, GamePhase, SoundEvent } from "./types";

const ASSETS = {
  lobby: require("../../assets/games/safi/audio/lobby.mp3"), round: require("../../assets/games/safi/audio/round.mp3"),
  final: require("../../assets/games/safi/audio/final.mp3"), result: require("../../assets/games/safi/audio/result.mp3"),
  crowd: require("../../assets/games/safi/audio/crowd.mp3"),
  kick: [require("../../assets/games/safi/audio/kick0.mp3"), require("../../assets/games/safi/audio/kick1.mp3"), require("../../assets/games/safi/audio/kick2.mp3")],
  catch: [require("../../assets/games/safi/audio/catch0.mp3"), require("../../assets/games/safi/audio/catch1.mp3"), require("../../assets/games/safi/audio/catch2.mp3")],
  break: [require("../../assets/games/safi/audio/break0.mp3"), require("../../assets/games/safi/audio/break1.mp3"), require("../../assets/games/safi/audio/break2.mp3")],
  cluck: [require("../../assets/games/safi/audio/cluck0.mp3"), require("../../assets/games/safi/audio/cluck1.mp3"), require("../../assets/games/safi/audio/cluck2.mp3")],
  frustrated: [require("../../assets/games/safi/audio/frustrated0.mp3"), require("../../assets/games/safi/audio/frustrated1.mp3"), require("../../assets/games/safi/audio/frustrated2.mp3")],
  cheer: [require("../../assets/games/safi/audio/cheer0.mp3"), require("../../assets/games/safi/audio/cheer1.mp3"), require("../../assets/games/safi/audio/cheer2.mp3")],
  whoosh: require("../../assets/games/safi/audio/whoosh.mp3"), near: require("../../assets/games/safi/audio/near.mp3"),
  critical: require("../../assets/games/safi/audio/critical.mp3"), landing: require("../../assets/games/safi/audio/landing.mp3"),
  slide: require("../../assets/games/safi/audio/slide.mp3"), ui: require("../../assets/games/safi/audio/ui.mp3"),
  reward: require("../../assets/games/safi/audio/reward.mp3"), achievement: require("../../assets/games/safi/audio/achievement.mp3"),
  combo: require("../../assets/games/safi/audio/combo.mp3"), hot: require("../../assets/games/safi/audio/hot.mp3"),
};
type Entry = { player: AudioPlayer; channel: AudioChannel; loop: boolean; factor: number };
type Music = "lobby" | "round" | "final" | "result";

/** Owns every player/timer. Music crossfades without any React frame updates. */
class GameAudio {
  private entries = new Map<number, Entry>();
  private last = new Map<string, number>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private fade: ReturnType<typeof setInterval> | null = null;
  private duck: ReturnType<typeof setTimeout> | null = null;
  private ducked = false;
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
      e = { player, channel, loop, factor: loop ? 0 : 1 };
      this.entries.set(id, e);
    }
    return e;
  }
  private mix() {
    for (const e of this.entries.values()) e.player.volume = this.active ? channelGain(this.preferences, e.channel, this.ducked) * e.factor : 0;
  }
  update(p: GamePreferences) { this.preferences = p; this.mix(); }
  scene(music: Music, active: boolean) {
    if (this.disposed) return;
    this.music = music;
    this.active = active;
    if (this.fade) clearInterval(this.fade);
    if (!active) {
      this.timers.forEach(clearTimeout); this.timers.clear();
      this.entries.forEach((e) => { e.player.volume = 0; e.player.pause(); });
      return;
    }
    const score = this.entry(ASSETS[music], "music", true);
    const crowd = this.entry(ASSETS.crowd, "crowd", true);
    const from = new Map([...this.entries.values()].map((e) => [e, e.factor]));
    score.player.play(); crowd.player.play();
    let n = 0;
    this.fade = setInterval(() => {
      n++;
      for (const e of this.entries.values()) {
        if (!e.loop) continue;
        const target = e === score || e === crowd ? 1 : 0;
        e.factor = (from.get(e) ?? 0) + (target - (from.get(e) ?? 0)) * n / 12;
        if (n === 12 && !target) e.player.pause();
      }
      this.mix();
      if (n >= 12 && this.fade) { clearInterval(this.fade); this.fade = null; }
    }, 25);
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
    e.player.volume = channelGain(this.preferences, channel);
    void e.player.seekTo(0).then(() => { if (!this.disposed && this.active && channelGain(this.preferences, channel)) e.player.play(); }).catch(() => undefined);
  }
  private after(ms: number, fn: () => void) {
    const t = setTimeout(() => { this.timers.delete(t); if (!this.disposed && this.active) fn(); }, ms);
    this.timers.add(t);
  }
  sound = (event: SoundEvent) => {
    if (!this.active || this.disposed) return;
    if (event === "shot") { this.effect(this.choose("kick")); this.after(80, () => this.effect(ASSETS.whoosh)); }
    else if (event === "catch") {
      this.effect(this.choose("catch")); this.after(260, () => this.effect(this.choose("cluck"), "chicken")); this.after(180, () => this.effect(ASSETS.landing));
    } else if (event === "goal") {
      this.effect(this.choose("cheer"), "crowd"); this.after(330, () => this.effect(this.choose("frustrated"), "chicken")); this.after(230, () => this.effect(ASSETS.landing)); this.after(440, () => this.effect(ASSETS.slide));
    } else if (event === "eggBreak") this.effect(this.choose("break"));
    else if (event === "nearMiss") this.effect(ASSETS.near, "crowd");
    else if (event === "criticalSave") this.effect(ASSETS.critical);
    else if (event === "luckyEgg") this.effect(ASSETS.reward);
    else if (event === "bossEntrance") { this.effect(ASSETS.hot); this.effect(this.choose("cheer"), "crowd"); }
    else if (event === "taunt") this.effect(this.choose("cluck"), "chicken");
    else if (event === "combo") this.effect(ASSETS.combo);
    else if (event === "hotStreak") this.effect(ASSETS.hot);
    else if (event === "achievement" || event === "personalBest") this.effect(ASSETS.achievement);
    else if (event === "reward" || event === "shopPurchase") this.effect(ASSETS.reward);
    else this.effect(ASSETS.ui);
    this.ducked = true; this.mix();
    if (this.duck) clearTimeout(this.duck);
    this.duck = setTimeout(() => { this.ducked = false; if (!this.disposed) this.mix(); }, 750);
  };
  dispose() {
    this.disposed = true;
    if (this.fade) clearInterval(this.fade);
    if (this.duck) clearTimeout(this.duck);
    this.timers.forEach(clearTimeout);
    this.entries.forEach((e) => { e.player.pause(); e.player.release(); });
    this.entries.clear();
  }
}

export function useGameAudio(p: GamePreferences, phase: GamePhase, used: number, active: boolean, loaded: boolean, external?: GameFeedback): GameFeedback {
  const mixer = useRef<GameAudio | null>(null);
  const music: Music = phase === "FINISHED" ? "result" : phase === "IDLE" || phase === "STARTING" ? "lobby" : used >= 7 ? "final" : "round";
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
