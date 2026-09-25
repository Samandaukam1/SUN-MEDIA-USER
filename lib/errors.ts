import { AuthError, isAuthApiError } from '@supabase/supabase-js';

type ErrorFields = { code?: unknown; message?: unknown };

const UNKNOWN_MESSAGE = 'Noma’lum xatolik yuz berdi. Qayta urinib ko‘ring.';
const INVALID_VALUE_MESSAGE = 'Kiritilgan ma’lumotlarni tekshirib, qayta urinib ko‘ring.';

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
  '23502': 'Majburiy maydonlarni to‘ldiring.',
  '22P02': INVALID_VALUE_MESSAGE,
  '22007': 'Sana yoki vaqt noto‘g‘ri kiritilgan.',
  '22008': 'Sana yoki vaqt noto‘g‘ri kiritilgan.',
  PGRST116: 'Ma’lumot topilmadi yoki sizga ko‘rinmaydi.',
  PGRST301: 'Sessiya muddati tugagan. Qaytadan kiring.',
};

// Only known RPC messages are translated. Database messages can contain private
// row values, constraint names, SQL and storage paths, so never display them raw.
const RPC_MESSAGES: Record<string, string> = {
  'Invalid period': 'Davr boshlanishi va tugashini tekshiring.',
  'Describe the requested changes': 'Kerakli o‘zgartirishlarni yozing.',
  'Cannot report on a future month': 'Kelajak oy uchun hisobot tuzib bo‘lmaydi.',
  'Report is already published; archive it before regenerating': 'Hisobot e’lon qilingan. Qayta tuzishdan oldin uni arxivlang.',
  'Generate the report before publishing': 'E’lon qilishdan oldin hisobotni tuzing.',
  'File must be an uploaded file of the same client': 'Shu mijozga yuklangan faylni tanlang.',
  'client_id is required': 'Mijozni tanlang.',
  'Content does not belong to this client': 'Kontent tanlangan mijozga tegishli emas.',
  'Only https links are allowed': 'Havola https:// bilan boshlanishi kerak.',
  'Only SUN MEDIA staff can be assigned here': 'Bu yerda faqat SUN MEDIA xodimini biriktirish mumkin.',
  'Staff members cannot be client users': 'Xodimni mijoz foydalanuvchisi sifatida biriktirib bo‘lmaydi.',
  'User already belongs to a client and cannot hold a staff role': 'Mijoz foydalanuvchisiga xodim rolini berib bo‘lmaydi.',
  'Client roles are assigned through client_members': 'Mijoz rolini mijozning foydalanuvchilari orqali belgilang.',
  'client_members accepts client roles only': 'Faqat mijoz rolini tanlang.',
  'Extra permissions are for staff only': 'Qo‘shimcha ruxsatlar faqat xodimlarga beriladi.',
};

// These messages are already emitted by the frozen authentication flow.
const LOCAL_MESSAGES = new Set([
  'Kirish tugallanmadi. Qayta urinib ko‘ring.',
  'Apple identifikatsiya tokeni olinmadi.',
]);

function fields(error: unknown): ErrorFields {
  return typeof error === 'object' && error !== null ? error as ErrorFields : {};
}

function knownMessage(messages: Record<string, string>, key: unknown): string | undefined {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(messages, key)
    ? messages[key]
    : undefined;
}

/** Use only for a message written by the app, never for raw server responses. */
export class UserFacingError extends Error {}

export function isNetworkError(error: unknown): boolean {
  const value = typeof error === 'string' ? error : fields(error).message;
  const message = typeof value === 'string' ? value : '';
  return /network request failed|failed to fetch|networkerror|load failed|timeout/i.test(message);
}

/** Converts Supabase / network errors into a short Uzbek message for the UI. */
export function toUserMessage(error: unknown): string {
  if (!error) return UNKNOWN_MESSAGE;
  if (error instanceof UserFacingError) return error.message;
  if (isNetworkError(error)) return 'Internet aloqasi yo‘q. Ulanishni tekshirib, qayta urinib ko‘ring.';

  if (error instanceof AuthError || isAuthApiError(error)) {
    const message = knownMessage(AUTH_MESSAGES, error.code);
    if (message) return message;
    if (/invalid login credentials/i.test(error.message)) return AUTH_MESSAGES.invalid_credentials;
    return 'Kirishda xatolik yuz berdi. Qayta urinib ko‘ring.';
  }

  const { code, message } = fields(error);
  const sqlMessage = knownMessage(SQLSTATE_MESSAGES, code);
  if (sqlMessage) return sqlMessage;
  if (code === '22023' || code === 'P0001') {
    const rpcMessage = knownMessage(RPC_MESSAGES, message);
    if (rpcMessage) return rpcMessage;
    if (typeof message === 'string') {
      if (/^Content is already (published|cancelled)$/.test(message)) return 'Yakunlangan kontentni bu tarzda o‘zgartirib bo‘lmaydi.';
      if (/^Version is not awaiting review \(status: [a-z_]+\)$/.test(message)) return 'Bu versiya hozir tasdiq kutmayapti. Ma’lumotni yangilang.';
      if (/^File size must be between 1 byte and \d+ bytes$/.test(message)) return 'Fayl bo‘sh yoki ruxsat etilgan hajmdan katta.';
      if (message.startsWith('Unsupported file type: ')) return 'Bu turdagi faylni yuklab bo‘lmaydi.';
    }
    return INVALID_VALUE_MESSAGE;
  }
  if (typeof message === 'string' && LOCAL_MESSAGES.has(message)) return message;
  return UNKNOWN_MESSAGE;
}

export function isPermissionError(error: unknown): boolean {
  return fields(error).code === '42501';
}
