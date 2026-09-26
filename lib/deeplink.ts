export type AppKind = 'client' | 'staff';

// Screens each audience can open from a notification. Older notifications used plural paths.
const PATTERNS: { match: RegExp; to: (id: string) => string; staffOnly?: boolean }[] = [
  { match: /^\/content\/([0-9a-f-]{36})$/, to: (id) => `/content/${id}` },
  { match: /^\/approvals\/([0-9a-f-]{36})$/, to: (id) => `/approvals/${id}` },
  { match: /^\/chat\/([0-9a-f-]{36})$/, to: (id) => `/chat/${id}` },
  { match: /^\/shootings?\/([0-9a-f-]{36})$/, to: (id) => `/shooting/${id}` },
  { match: /^\/tasks?\/([0-9a-f-]{36})$/, to: (id) => `/task/${id}`, staffOnly: true },
  { match: /^\/announcements\/([0-9a-f-]{36})$/, to: (id) => `/announcements/${id}`, staffOnly: true },
  { match: /^\/files\/view\/([0-9a-f-]{36})$/, to: (id) => `/files/view/${id}` },
];

/**
 * Turns the `route` stored with a notification into a path inside the user's interface, or null
 * when this app version has no screen for it (the notification is then only marked read).
 */
export function notificationPath(route: unknown, kind: AppKind): string | null {
  if (typeof route !== 'string') return null;
  const clean = route.trim().replace(/\/+$/, '').toLowerCase();
  for (const p of PATTERNS) {
    const m = clean.match(p.match);
    if (m) return p.staffOnly && kind === 'client' ? null : p.to(m[1]);
  }
  return null;
}
