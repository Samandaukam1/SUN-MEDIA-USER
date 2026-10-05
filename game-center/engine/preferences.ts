export const AUDIO_CHANNELS = ["music", "sfx", "crowd", "chicken"] as const;
export type AudioChannel = (typeof AUDIO_CHANNELS)[number];
export type GamePreferences = {
  master: boolean;
  masterVolume: number;
  haptics: boolean;
  reduceMotion: boolean;
  channels: Record<AudioChannel, { enabled: boolean; volume: number }>;
};
export const DEFAULT_PREFERENCES: GamePreferences = {
  master: true, masterVolume: 100, haptics: true, reduceMotion: false,
  channels: {
    music: { enabled: true, volume: 45 }, sfx: { enabled: true, volume: 75 },
    crowd: { enabled: true, volume: 25 }, chicken: { enabled: true, volume: 80 },
  },
};
const volume = (v: unknown, fallback: number) => typeof v === "number" && Number.isFinite(v) ? Math.round(Math.max(0, Math.min(100, v))) : fallback;
const bool = (v: unknown, fallback: boolean) => typeof v === "boolean" ? v : fallback;
/** A corrupted or old preference file cannot enable recording or break the mixer. */
export function readPreferences(value: unknown): GamePreferences {
  const p = (value && typeof value === "object" ? value : {}) as Partial<GamePreferences>;
  return {
    master: bool(p.master, true), masterVolume: volume(p.masterVolume, 100),
    haptics: bool(p.haptics, true), reduceMotion: bool(p.reduceMotion, false),
    channels: Object.fromEntries(AUDIO_CHANNELS.map((key) => [key, {
      enabled: bool(p.channels?.[key]?.enabled, true),
      volume: volume(p.channels?.[key]?.volume, DEFAULT_PREFERENCES.channels[key].volume),
    }])) as GamePreferences["channels"],
  };
}
export function channelGain(p: GamePreferences, channel: AudioChannel, ducked = false): number {
  const c = p.channels[channel];
  return p.master && c.enabled ? p.masterVolume / 100 * c.volume / 100 * (channel === "music" && ducked ? 0.35 : 1) : 0;
}
