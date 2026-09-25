# SUN MEDIA — mobil ilova

Expo (SDK 54) + React Native + TypeScript strict. Mijozlar, xodimlar va rahbariyat uchun bitta ilova: kirgandan keyin rol bo‘yicha interfeys avtomatik ochiladi.

## Ishga tushirish

```bash
npm install
npm run web        # brauzerda: http://localhost:8081
npm run ios        # development build o‘rnatilgan simulator/qurilma
npm run android
```

Tekshiruvlar: `npm run typecheck`, `npm run export:web`.

## Muhit (env)

`.env.example` dan nusxa oling. Faqat public qiymatlar:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (yoki legacy `EXPO_PUBLIC_SUPABASE_ANON_KEY`)

`service_role` / `sb_secret_` kaliti hech qachon mobil ilovaga kiritilmaydi — ruxsatlarni bazadagi RLS tekshiradi.

### Lokal backend

Backend `SUN-MEDIA-ADMIN/supabase` ichida. U yerda `npm run db:start` va `npm run db:reset` (seed bilan) bajaring, so‘ng bu loyihada `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase start chiqargan PUBLISHABLE_KEY>
```

Lokal seed hisoblari (faqat lokal, parol `SunMedia2026!`): `owner@sunmedia.local`, `admin@…`, `pm@…`, `smm@…`, `operator@…`, `editor@…`, `designer@…`, `safi@client.local`, `wedrink@client.local`.

## Tuzilma

```
app/            expo-router marshrutlari: (auth), pending, client/, staff/, manage/
components/     ui/ (dizayn tizimi), brand/ (logo, splash), navigation/
features/       auth, home, dashboard, profile … (har biri: api.ts + komponentlar)
lib/            supabase, env (zod), query-client, realtime, errors, time
constants/      theme, labels
types/          database.ts (generatsiya: ADMIN'da `npm run db:types`), app.ts
```

Arxitektura: `SUN-MEDIA-ADMIN/docs/ARCHITECTURE.md`.

## Development build (EAS)

```bash
npx eas-cli login
npm run build:ios:dev      # yoki build:android:dev
```

Push bildirishnomalar va Apple/Google kirish uchun development build kerak (Expo Go emas).
