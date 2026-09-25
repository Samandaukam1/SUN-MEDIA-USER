import { z } from 'zod';

import { UserFacingError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';

export const profileInput = z.object({
  first_name: z.string().trim().min(1, 'Ismingizni yozing').max(60),
  last_name: z.string().trim().min(1, 'Familiyangizni yozing').max(60),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d+]/g, ''))
    .refine((v) => v === '' || /^\+?\d{7,15}$/.test(v), 'Telefon raqami noto‘g‘ri'),
});
export type ProfileInput = z.infer<typeof profileInput>;

export async function fetchOwnProfile(userId: string) {
  const { data, error } = await getSupabase().from('profiles').select('first_name, last_name, full_name, phone, email').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function updateOwnProfile(userId: string, input: ProfileInput): Promise<void> {
  const { error } = await getSupabase().rpc('update_account_profile', {
    p_user_id: userId,
    p_first_name: input.first_name,
    p_last_name: input.last_name,
    p_phone: input.phone || undefined,
  });
  if (error) throw error;
}

/** Rules shown next to the field; the server applies its own policy as well. */
export const PASSWORD_RULES = [
  { key: 'length', label: 'Kamida 8 ta belgi', test: (v: string) => v.length >= 8 },
  { key: 'letter', label: 'Harf', test: (v: string) => /[A-Za-z]/.test(v) },
  { key: 'digit', label: 'Raqam', test: (v: string) => /\d/.test(v) },
] as const;

const AUTH_PASSWORD_ERRORS: Record<string, string> = {
  same_password: 'Yangi parol hozirgisidan farq qilishi kerak.',
  weak_password: 'Parol juda oddiy. Uzunroq va murakkabroq parol tanlang.',
  reauthentication_needed: 'Xavfsizlik uchun tizimdan chiqib, qayta kiring va keyin parolni o‘zgartiring.',
  session_not_found: 'Sessiya tugagan. Qayta kiring.',
};

/** Replaces the temporary password the admin issued. Does not touch the sign-in flow. */
export async function changePassword(password: string, confirm: string): Promise<void> {
  if (!PASSWORD_RULES.every((r) => r.test(password))) throw new UserFacingError('Parol talablarga javob bermaydi.');
  if (password !== confirm) throw new UserFacingError('Parollar bir xil emas.');
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) {
    const message = error.code ? AUTH_PASSWORD_ERRORS[error.code] : undefined;
    throw message ? new UserFacingError(message) : error;
  }
}
