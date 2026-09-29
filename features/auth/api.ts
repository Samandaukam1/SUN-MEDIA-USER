import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { z } from 'zod';

import { env } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';
import { myContextSchema, type MyContext } from '@/types/app';

WebBrowser.maybeCompleteAuthSession();

export const signInSchema = z.object({
  email: z.email({ message: 'Email manzilini to‘g‘ri kiriting' }),
  password: z.string().min(6, { message: 'Parol kamida 6 ta belgidan iborat' }),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: 'Kamida 8 ta belgi' })
      .regex(/[A-Za-z]/, { message: 'Kamida bitta harf' })
      .regex(/\d/, { message: 'Kamida bitta raqam' }),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Parollar mos kelmadi', path: ['confirm'] });

/** Web builds served under a sub-path (GitHub Pages: /SUN-MEDIA-USER) get it inlined from experiments.baseUrl. */
function webBasePath(): string {
  return (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');
}

/** Where Supabase sends the user back after Google / Apple / password-reset (must be in the Auth redirect allow list). */
export function authRedirect(path: 'auth/callback' | 'reset-password'): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}${webBasePath()}/${path}`;
  }
  return makeRedirectUri({ scheme: 'sunmedia', path });
}

const providersSchema = z.object({ external: z.object({ google: z.boolean().optional(), apple: z.boolean().optional() }).passthrough() });
export type AuthProviders = { google: boolean; apple: boolean };

/**
 * Which social providers the backend has switched on (public Auth settings). Buttons for providers that are not
 * configured yet are hidden instead of failing with "provider is not enabled".
 */
export async function fetchAuthProviders(): Promise<AuthProviders> {
  if (!env) return { google: false, apple: false };
  const response = await fetch(`${env.supabaseUrl}/auth/v1/settings`, { headers: { apikey: env.supabaseKey } });
  if (!response.ok) throw new Error(`Auth settings ${response.status}`);
  const { external } = providersSchema.parse(await response.json());
  return { google: external.google === true, apple: external.apple === true };
}

export async function fetchMyContext(): Promise<MyContext> {
  const { data, error } = await getSupabase().rpc('get_my_context');
  if (error) throw error;
  return myContextSchema.parse(data);
}

export async function signInWithPassword(input: SignInInput): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (error) throw error;
}

/** Google (and Apple on Android/web) through the Supabase hosted OAuth flow with PKCE. */
export async function signInWithOAuth(provider: 'google' | 'apple'): Promise<'success' | 'cancelled'> {
  const supabase = getSupabase();
  const redirectTo = authRedirect('auth/callback');

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) throw error;
    return 'success';
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return 'cancelled';

  const { queryParams } = Linking.parse(result.url);
  const errorDescription = queryParams?.error_description;
  if (typeof errorDescription === 'string') throw new Error(errorDescription);
  const code = queryParams?.code;
  if (typeof code !== 'string') throw new Error('Kirish tugallanmadi. Qayta urinib ko‘ring.');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  return 'success';
}

/** Native Sign in with Apple on iOS (required by App Store guidelines for a native experience). */
export async function signInWithAppleNative(): Promise<'success' | 'cancelled'> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return 'cancelled';
    throw e;
  }
  if (!credential.identityToken) throw new Error('Apple identifikatsiya tokeni olinmadi.');

  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  // Apple shares the name only on the very first sign-in.
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
  if (fullName) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', data.user.id);
    }
  }
  return 'success';
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: authRedirect('reset-password'),
  });
  if (error) throw error;
}

export async function exchangeAuthCode(code: string): Promise<void> {
  const { error } = await getSupabase().auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw error;
  await markPasswordChanged();
}

/** The person chose their own password: the "replace the temporary password" reminder disappears. */
export async function markPasswordChanged(): Promise<void> {
  const { error } = await getSupabase().rpc('mark_password_changed');
  if (error) console.warn('mark_password_changed', error.message);
}

/** Pending screen: tells SUN MEDIA admins once that this login is waiting for a role (idempotent). */
export async function requestAccess(): Promise<void> {
  const { error } = await getSupabase().rpc('request_access');
  if (error) throw error;
}
