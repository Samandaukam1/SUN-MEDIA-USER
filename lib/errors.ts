import { AuthError, isAuthApiError } from '@supabase/supabase-js';

type PostgrestLikeError = { code?: string; message?: string; details?: string | null; hint?: string | null };

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email yoki parol noto‘g‘ri.',
  email_not_confirmed: 'Email hali tasdiqlanmagan. Pochtangizni tekshiring.',
  user_banned: 'Hisobingiz bloklangan. Administrator bilan bog‘laning.',
  over_request_rate_limit: 'Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring.',
  over_email_send_rate_limit: 'Juda ko‘p xat yuborildi. Birozdan so‘ng qayta urinib ko‘ring.',
  same_password: 'Yangi parol eskisidan farq qilishi kerak.',
  weak_password: 'Parol juda oddiy. Kamida 8 ta belgi, harf va raqam ishlating.',
  signup_disabled: 'Bu hisob tizimda yo‘q. Administrator sizga hisob yaratishi kerak.',
  flow_state_not_found: 'Havola eskirgan. Uni shu qurilmada qayta oching yoki yangisini so‘rang.',
  flow_state_expired: 'Havola muddati tugagan. Yangisini so‘rang.',
};

const SQLSTATE_MESSAGES: Record<string, string> = {
  '42501': 'Bu amal uchun ruxsatingiz yo‘q.',
  P0002: 'Ma’lumot topilmadi yoki sizga ko‘rinmaydi.',
  '23505': 'Bunday yozuv allaqachon mavjud.',
  '23503': 'Bog‘liq ma’lumot topilmadi.',
  '23514': 'Kiritilgan qiymat qoidalarga mos emas.',
  PGRST301: 'Sessiya muddati tugagan. Qaytadan kiring.',
};

export function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /network request failed|failed to fetch|networkerror|load failed|timeout/i.test(message);
}

/** Converts Supabase / network errors into a short Uzbek message for the UI. */
export function toUserMessage(error: unknown): string {
  if (!error) return 'Noma’lum xatolik yuz berdi.';
  if (isNetworkError(error)) return 'Internet aloqasi yo‘q. Ulanishni tekshirib, qayta urinib ko‘ring.';

  if (error instanceof AuthError || isAuthApiError(error)) {
    const code = (error as AuthError).code;
    if (code && AUTH_MESSAGES[code]) return AUTH_MESSAGES[code];
    if (/invalid login credentials/i.test(error.message)) return AUTH_MESSAGES.invalid_credentials;
    return error.message;
  }

  const pg = error as PostgrestLikeError;
  if (pg.code && SQLSTATE_MESSAGES[pg.code]) {
    // 22023 / P0001 carry a meaningful message from our RPCs
    return SQLSTATE_MESSAGES[pg.code];
  }
  if (pg.code === '22023' || pg.code === 'P0001') return pg.message ?? 'Noto‘g‘ri qiymat.';
  if (error instanceof Error) return error.message;
  return pg.message ?? 'Noma’lum xatolik yuz berdi.';
}

export function isPermissionError(error: unknown): boolean {
  return (error as PostgrestLikeError)?.code === '42501';
}
