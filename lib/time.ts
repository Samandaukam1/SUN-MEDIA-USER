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
