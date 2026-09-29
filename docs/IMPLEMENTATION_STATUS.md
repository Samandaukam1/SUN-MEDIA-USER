# SUN MEDIA — holat (2026-09-28)

Mobil ilova (Expo SDK 54) + admin panel (Next.js 15) + Supabase. Barcha 18 bosqich lokal muhitda yakunlangan va tekshirilgan. Cloud (production) bazaga migratsiya yuborilmagan — bu egasining qarori bilan bajariladi (pastda).

## Modullar

| Modul | Mobil | Admin | Baza |
|---|---|---|---|
| 5 tab: Bosh sahifa / Kalendar / Studiya / Xabarlar / Akkaunt | ✅ rol bo‘yicha | — | — |
| Akkaunt yaratish, vaqtinchalik parol, holatlar | — | ✅ | RPC + audit |
| Jamoa, rollar, ruxsatlar, sozlamalar | ✅ katalog | ✅ | RLS |
| Ish joyi: e’lonlar, tadbirlar, hujjatlar | ✅ | ✅ | ✅ |
| Studiya: kontent jarayoni, loyihalar | ✅ | ✅ Ish jarayoni → Kontent, Mijozlar → Loyihalar | atomik RPC |
| Kalendar (kun/hafta/oy), syomkalar | ✅ | ✅ hafta/oy, syomkalar | ✅ |
| Vazifalar, checklist, bog‘liqlik, deadline eslatmalari | ✅ | ✅ ro‘yxat, yaratish, qoidalar | pg_cron |
| Davomat (faqat admin belgilaydi), KPI | ✅ bir bosishda | ✅ bir bosishda, samaradorlik | ✅ |
| Tasdiqlash markazi, video, vaqtli izohlar, o‘zgartirishlar | ✅ | ✅ navbat | ✅ |
| Fayllar, papkalar, bo‘laklab yuklash, vazifa ilovalari | ✅ | ✅ ko‘rish, yuklab olish | Storage RLS |
| Xabarlar: chat (shaxsiy/guruh/loyiha), tasdiqlar, bildirishnomalar | ✅ realtime | — | ✅ |
| Push: ro‘yxatdan o‘tish, bosilganda ochish, sozlamalar | ✅ | — | Edge Function |
| Tariflar, sarf, tarif so‘rovlari | ✅ mijoz | ✅ katalog + mijoz tabi | ✅ |
| Statistika, oylik hisobot, PDF | ✅ | ✅ | ✅ |
| Global qidiruv, mijoz ko‘rinishi, tezkor yaratish | ✅ | ✅ qidiruv, “+ Yaratish” | ✅ |
| Faoliyat tarixi (audit) | — | ✅ | trigger’lar |
| Shartnomalar | — | ✅ | RLS |
| UX soddalashtirish (docs/UX_AUDIT.md) | ✅ 5 tab | ✅ 6 bo‘lim | nomlar |

## Tekshiruv

| Nima | Natija |
|---|---|
| pgTAP (`npm run db:test`, ADMIN) | 490/490 |
| PL/pgSQL lint | 0 ogohlantirish |
| Xavfsizlik invariantlari (016) | RLS hamma joyda, anon’ga hech narsa, definer funksiyalar tekshiradi |
| Mobil: tsc / lint / unit | ✅ / ✅ / 30 |
| `expo-doctor` | 18/18 |
| iOS production bundle (`expo export`) | ✅ (Hermes, 5.7 MB) |
| Admin: tsc / lint / `next build` | ✅ / ✅ / ✅ |
| Admin production server (lokal env) | 15 sahifa 200, CSP buzilishsiz |
| Simulator | barcha 12 rol bilan kirib ko‘rildi; asosiy oqimlar Maestro bilan |

## Egasining qarori kerak bo‘lgan qadamlar

1. **Cloud migratsiya:** `npx supabase link --project-ref <ref>` → `npx supabase db push` (seed yuborilmaydi).
2. **Vercel:** env’lar (ADMIN README → Vercel). `.env.local` cloud’ga qaraydi — production build shuni ishlatadi.
3. **Push:** EAS loyihasi (`EAS_PROJECT_ID`), `push-dispatch` deploy, secret va vault (ADMIN README → Push).
4. **Mobil production build:** EAS env’lar (README → Production / preview build uchun env).
5. Birinchi owner akkaunti cloud’da (lokal test loginlari cloud’da yo‘q).

## Ma’lum cheklovlar

- Push haqiqiy qurilmada EAS loyihasi ulangach tekshiriladi (lokalda dispatcher mock orqali uchdan-uchgacha sinalgan).
- Ijtimoiy tarmoq statistikasi qo‘lda kiritiladi (API ulanish keyingi bosqich; jadval va kredensial saqlash tayyor).
- Chat’da xabarni nusxalash o‘rniga “Ulashish” (clipboard native modul qo‘shilmagan).
