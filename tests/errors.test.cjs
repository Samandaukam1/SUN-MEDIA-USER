const assert = require('node:assert/strict');
const test = require('node:test');
const { AuthApiError, AuthError } = require('@supabase/supabase-js');
const { isNetworkError, isPermissionError, toUserMessage, UserFacingError } = require('../lib/errors.ts');

test('database permission errors never expose protected table or row details', () => {
  assert.equal(toUserMessage({
    code: '42501',
    message: 'permission denied for table employee_payroll',
    details: 'Employee salary: 10000000',
    hint: 'Grant access to employee_payroll',
  }), 'Bu amal uchun ruxsatingiz yo‘q.');
});

test('constraint and missing-row errors have actionable Uzbek messages', () => {
  const cases = [
    ['23505', 'Bunday yozuv allaqachon mavjud.'],
    ['23503', 'Bog‘liq ma’lumot topilmadi.'],
    ['23514', 'Kiritilgan qiymat qoidalarga mos emas.'],
    ['23502', 'Majburiy maydonlarni to‘ldiring.'],
    ['P0002', 'Ma’lumot topilmadi yoki sizga ko‘rinmaydi.'],
    ['PGRST116', 'Ma’lumot topilmadi yoki sizga ko‘rinmaydi.'],
    ['PGRST301', 'Sessiya muddati tugagan. Qaytadan kiring.'],
  ];
  for (const [code, expected] of cases) {
    assert.equal(toUserMessage({ code, message: 'private diagnostic' }), expected);
  }
});

test('known RPC validation errors explain the correction', () => {
  assert.equal(toUserMessage({ code: '22023', message: 'Invalid period' }), 'Davr boshlanishi va tugashini tekshiring.');
  assert.equal(toUserMessage({ code: 'P0001', message: 'Describe the requested changes' }), 'Kerakli o‘zgartirishlarni yozing.');
  assert.equal(toUserMessage({ code: '22023', message: 'File size must be between 1 byte and 52428800 bytes' }), 'Fayl bo‘sh yoki ruxsat etilgan hajmdan katta.');
  assert.equal(toUserMessage({ code: '22023', message: 'Version is not awaiting review (status: approved)' }), 'Bu versiya hozir tasdiq kutmayapti. Ma’lumotni yangilang.');
});

test('unknown RPC diagnostics do not leak raw text, even if it looks localized', () => {
  for (const code of ['22023', 'P0001']) {
    for (const message of ['private SQL values: secret', 'Maxfiy mijoz: SAFI', 'toString', 'constructor']) {
      assert.equal(toUserMessage({ code, message }), 'Kiritilgan ma’lumotlarni tekshirib, qayta urinib ko‘ring.');
    }
  }
});

test('unrecognized database and JavaScript errors return a safe fallback', () => {
  const expected = 'Noma’lum xatolik yuz berdi. Qayta urinib ko‘ring.';
  for (const error of [
    { code: '42P01', message: 'relation private.customer_finances does not exist' },
    new Error('SQL: select salary from employees'),
    { message: 'secret token in a server response' },
    'private diagnostic',
    null, undefined, false, 42, {}, { message: 42, code: [] }, Object.create(null),
  ]) {
    assert.equal(toUserMessage(error), expected);
  }
});

test('prototype property names cannot become error translations', () => {
  for (const code of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    assert.equal(toUserMessage({ code, message: 'private diagnostic' }), 'Noma’lum xatolik yuz berdi. Qayta urinib ko‘ring.');
    assert.equal(toUserMessage(new AuthApiError('private diagnostic', 400, code)), 'Kirishda xatolik yuz berdi. Qayta urinib ko‘ring.');
  }
});

test('existing localized authentication errors remain unchanged', () => {
  const cases = [
    ['invalid_credentials', 'Email yoki parol noto‘g‘ri.'],
    ['email_not_confirmed', 'Email hali tasdiqlanmagan. Pochtangizni tekshiring.'],
    ['user_banned', 'Hisobingiz bloklangan. Administrator bilan bog‘laning.'],
    ['over_request_rate_limit', 'Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring.'],
    ['over_email_send_rate_limit', 'Juda ko‘p xat yuborildi. Birozdan so‘ng qayta urinib ko‘ring.'],
    ['same_password', 'Yangi parol eskisidan farq qilishi kerak.'],
    ['weak_password', 'Parol juda oddiy. Kamida 8 ta belgi, harf va raqam ishlating.'],
    ['signup_disabled', 'Bu hisob tizimda yo‘q. Administrator sizga hisob yaratishi kerak.'],
    ['flow_state_not_found', 'Havola eskirgan. Uni shu qurilmada qayta oching yoki yangisini so‘rang.'],
    ['flow_state_expired', 'Havola muddati tugagan. Yangisini so‘rang.'],
  ];
  for (const [code, expected] of cases) {
    assert.equal(toUserMessage(new AuthApiError('server diagnostic', 400, code)), expected);
  }
  assert.equal(toUserMessage(new AuthError('Invalid login credentials')), 'Email yoki parol noto‘g‘ri.');
});

test('API auth errors from another realm still use their known code', () => {
  assert.equal(toUserMessage({ __isAuthError: true, name: 'AuthApiError', code: 'invalid_credentials', message: 'server diagnostic' }), 'Email yoki parol noto‘g‘ri.');
});

test('unknown authentication errors cannot expose provider diagnostics', () => {
  assert.equal(toUserMessage(new AuthApiError('provider response: secret token', 500, 'unexpected_failure')), 'Kirishda xatolik yuz berdi. Qayta urinib ko‘ring.');
});

test('frozen local authentication messages remain readable', () => {
  for (const message of ['Kirish tugallanmadi. Qayta urinib ko‘ring.', 'Apple identifikatsiya tokeni olinmadi.']) {
    assert.equal(toUserMessage(new Error(message)), message);
  }
});

test('app-authored user-facing errors have an explicit safe path', () => {
  assert.equal(toUserMessage(new UserFacingError('Kontent nomini kiriting.')), 'Kontent nomini kiriting.');
});

test('fetch errors work for Error, string and PostgREST object responses', () => {
  for (const error of [new TypeError('Failed to fetch'), 'Network request failed', { message: 'TypeError: Failed to fetch', code: '' }, { message: 'NetworkError when attempting to fetch resource.' }]) {
    assert.equal(isNetworkError(error), true);
    assert.equal(toUserMessage(error), 'Internet aloqasi yo‘q. Ulanishni tekshirib, qayta urinib ko‘ring.');
  }
  for (const error of [null, undefined, {}, 42, { message: [] }, new Error('validation failed')]) {
    assert.equal(isNetworkError(error), false);
  }
});

test('permission classification is based on an exact SQLSTATE code', () => {
  assert.equal(isPermissionError({ code: '42501' }), true);
  for (const error of [null, undefined, false, 42501, '42501', { code: 42501 }, { code: '23505' }]) {
    assert.equal(isPermissionError(error), false);
  }
});
