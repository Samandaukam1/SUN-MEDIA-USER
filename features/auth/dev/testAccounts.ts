/**
 * DEV ONLY — the local seed accounts (ADMIN repo: supabase/seed.sql). Screens load this module only behind
 * `__DEV__`, so Metro leaves it, and the shared test password, out of production bundles.
 */
import { env } from '@/lib/env';
import { signInWithPassword } from '../api';

const TEST_PASSWORD = 'SunMedia2026!';

export type TestAccount = { label: string; email: string };

export const TEST_ACCOUNTS: TestAccount[] = [
  { label: 'Owner', email: 'owner@sunmedia.local' },
  { label: 'Admin', email: 'admin@sunmedia.local' },
  { label: 'Project Manager', email: 'manager@sunmedia.local' },
  { label: 'SMM Manager', email: 'smm@sunmedia.local' },
  { label: 'Operator', email: 'operator@sunmedia.local' },
  { label: 'Montajyor', email: 'editor@sunmedia.local' },
  { label: 'Designer', email: 'designer@sunmedia.local' },
  { label: 'Copywriter', email: 'copywriter@sunmedia.local' },
  { label: 'Client Owner', email: 'safi@client.local' },
  { label: 'Client Employee', email: 'safi.employee@client.local' },
];

/** The quick role switch on the account screen. */
export const SWITCH_ACCOUNTS: TestAccount[] = [
  { label: 'Owner', email: 'owner@sunmedia.local' },
  { label: 'Admin', email: 'admin@sunmedia.local' },
  { label: 'Operator', email: 'operator@sunmedia.local' },
  { label: 'Editor', email: 'editor@sunmedia.local' },
  { label: 'Client', email: 'safi@client.local' },
];

const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[\w-]+\.local)$/i;

/** Host of the Supabase project the app talks to. */
export function backendHost(): string | null {
  try {
    return env ? new URL(env.supabaseUrl).host : null;
  } catch {
    return null;
  }
}

/** The test accounts exist only in the local Supabase — never send them to a hosted project. */
export function isLocalBackend(): boolean {
  const host = backendHost();
  return !!host && LOCAL_HOST.test(host.replace(/:\d+$/, ''));
}

/** Real email/password sign-in; the auth listener then loads the profile and opens the role's interface. */
export function signInAsTestAccount(email: string): Promise<void> {
  return signInWithPassword({ email, password: TEST_PASSWORD });
}
