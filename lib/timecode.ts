/** Video positions in revision comments are stored as integer milliseconds (13000 = 00:13). */
export function formatTimecode(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '--:--';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Parses "13", "0:13", "1:02:03" (and "00:13.5") into milliseconds; null when unreadable. */
export function parseTimecode(text: string): number | null {
  const parts = text.trim().split(':');
  if (parts.length === 0 || parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.slice(1).some((n) => n >= 60)) return null;
  const seconds = nums.reduce((acc, n) => acc * 60 + n, 0);
  return Math.round(seconds * 1000);
}

/** Position of a marker on a timeline, 0…1; unknown durations put everything at the start. */
export function timelineFraction(ms: number | null | undefined, durationMs: number | null | undefined): number {
  if (ms == null || !durationMs || durationMs <= 0) return 0;
  return Math.max(0, Math.min(1, ms / durationMs));
}
