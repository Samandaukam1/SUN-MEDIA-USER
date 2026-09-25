// Uzbekistan has no daylight saving time; the agency works in Asia/Tashkent (UTC+5).
// A fixed offset avoids depending on Intl time-zone data, which differs between Hermes builds.
export const AGENCY_UTC_OFFSET_MINUTES = 5 * 60;

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const WEEKDAYS_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

/** Wall-clock parts in agency time for an instant. */
function local(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const shifted = new Date(d.getTime() + AGENCY_UTC_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" of the agency day containing the instant. */
export function agencyDateKey(date: Date | string = new Date()): string {
  const p = local(date);
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`;
}

/** Start (inclusive) and end (exclusive) instants of an agency day, as ISO strings. */
export function agencyDayRange(dateKey: string = agencyDateKey()): { from: string; to: string } {
  const [y, m, d] = dateKey.split('-').map(Number);
  const startUtc = Date.UTC(y, m - 1, d) - AGENCY_UTC_OFFSET_MINUTES * 60_000;
  return { from: new Date(startUtc).toISOString(), to: new Date(startUtc + 86_400_000).toISOString() };
}

export function addDaysToKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const p = local(date);
  return `${pad(p.hours)}:${pad(p.minutes)}`;
}

/** "25 sentabr" */
export function formatDayMonth(date: Date | string): string {
  const p = local(date);
  return `${p.day} ${MONTHS[p.month]}`;
}

/** "25 sen, 11:00" */
export function formatShortDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const p = local(date);
  return `${p.day} ${MONTHS_SHORT[p.month]}, ${pad(p.hours)}:${pad(p.minutes)}`;
}

/** "Payshanba, 25 sentabr" for a date key */
export function formatDateKeyLong(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[weekday]}, ${d} ${MONTHS[m - 1]}`;
}

export function weekdayShort(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return WEEKDAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function monthName(monthIndex: number): string {
  return MONTHS[monthIndex];
}

export function greetingForNow(date: Date = new Date()): string {
  const h = local(date).hours;
  if (h < 5) return 'Xayrli tun';
  if (h < 11) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

/** "2 soat 15 daqiqa" style duration between now and a deadline (positive = remaining). */
export function formatRelativeDeadline(deadline: string | null | undefined, now: Date = new Date()): string | null {
  if (!deadline) return null;
  const diffMin = Math.round((new Date(deadline).getTime() - now.getTime()) / 60_000);
  const abs = Math.abs(diffMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const text = h > 0 ? `${h} soat${m ? ` ${m} daq` : ''}` : `${m} daq`;
  return diffMin >= 0 ? `${text} qoldi` : `${text} kechikdi`;
}

/** "HH:MM" wall-clock time in agency time. */
export function agencyTimeKey(date: Date | string): string {
  const p = local(date);
  return `${pad(p.hours)}:${pad(p.minutes)}`;
}

/** Instant (ISO) for an agency-local date key and "HH:MM". */
export function agencyDateTimeToIso(dateKey: string, time: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - AGENCY_UTC_OFFSET_MINUTES * 60_000).toISOString();
}

/** First day of the month containing the key, e.g. "2026-09-01". */
export function monthStartKey(dateKey: string = agencyDateKey()): string {
  return `${dateKey.slice(0, 7)}-01`;
}

export function addMonthsToKey(dateKey: string, months: number): string {
  const [y, m] = dateKey.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-01`;
}

/** Monday-first weekday index (0 = Monday … 6 = Sunday). */
export function weekdayIndexMonFirst(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Monday of the week containing the key. */
export function weekStartKey(dateKey: string): string {
  return addDaysToKey(dateKey, -weekdayIndexMonFirst(dateKey));
}

export function daysInMonth(dateKey: string): number {
  const [y, m] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 6×7 grid of date keys for a month view, Monday first, padded with adjacent months. */
export function monthGrid(monthKey: string): string[] {
  const first = monthStartKey(monthKey);
  const start = addDaysToKey(first, -weekdayIndexMonFirst(first));
  return Array.from({ length: 42 }, (_, i) => addDaysToKey(start, i));
}

/** "Sentabr 2026" */
export function formatMonthYear(dateKey: string): string {
  const [y, m] = dateKey.split('-').map(Number);
  const name = MONTHS[m - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${y}`;
}

/** "25 sentabr 2026" */
export function formatDateKey(dateKey: string, withYear = false): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return withYear ? `${d} ${MONTHS[m - 1]} ${y}` : `${d} ${MONTHS[m - 1]}`;
}

/** "25 sen" for compact lists */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const p = local(date);
  return `${p.day} ${MONTHS_SHORT[p.month]}`;
}

/** Relative "hozirgina / 5 daq oldin / 3 soat oldin / 25 sen" for feeds and chat. */
export function formatAgo(date: Date | string, now: Date = new Date()): string {
  const diffMin = Math.floor((now.getTime() - new Date(date).getTime()) / 60_000);
  if (diffMin < 1) return 'hozirgina';
  if (diffMin < 60) return `${diffMin} daq oldin`;
  if (agencyDateKey(date) === agencyDateKey(now)) return `${Math.floor(diffMin / 60)} soat oldin`;
  if (agencyDateKey(date) === addDaysToKey(agencyDateKey(now), -1)) return `kecha, ${formatTime(date)}`;
  return formatShortDateTime(date);
}

export const WEEKDAY_SHORT_MON_FIRST = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

/** mm:ss or h:mm:ss for media timecodes. */
export function formatTimecode(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
