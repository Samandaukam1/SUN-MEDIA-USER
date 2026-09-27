# SUN MEDIA — mobil ilova

Expo (SDK 54) + React Native + TypeScript strict. Mijozlar, xodimlar va rahbariyat uchun bitta ilova: kirgandan keyin rol bo‘yicha interfeys avtomatik ochiladi.

## Ishga tushirish

```bash
npm install
npm run web        # brauzerda: http://localhost:8081
npm run ios        # development build o‘rnatilgan simulator/qurilma
npm run android
```

Tekshiruvlar: `npm run typecheck`, `npm run lint`, `npm test` (unit), `npx expo-doctor`, `npx expo export --platform ios` (production bundle).

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

Lokal seed hisoblari (faqat lokal, parol `SunMedia2026!`): `owner@sunmedia.local`, `admin@…`, `manager@…`, `pm@…`, `smm@…`, `operator@…`, `editor@…`, `designer@…`, `copywriter@…`, `safi@client.local`, `safi.employee@client.local`, `wedrink@client.local`. To‘liq jadval — ADMIN README.

**DEV QUICK ACCESS.** Development'da (Metro, `__DEV__`) va backend lokal bo‘lsa, login ekranida 10 ta rol tugmasi, Akkaunt ekranida “Switch Test Role” (Owner / Admin / Operator / Editor / Client) chiqadi. Ikkalasi ham oddiy `signInWithPassword` orqali kiradi (switch — chiqish + qayta kirish). Production bundle'da bu kod va test parol umuman yo‘q.

> `.env` (cloud) va `.env.local` (lokal) ikkalasi ham Git'ga kirmaydi. Lokalda `.env.local` ustun turadi.

## Tuzilma

```
app/            expo-router marshrutlari: (auth), pending, client/, staff/, manage/
components/     ui/ (dizayn tizimi), brand/ (logo, splash), navigation/
features/       auth, home, dashboard, studio, calendar, shootings, tasks, approvals, files,
                inbox (chat), notifications (push), plan, reports, clients, search, team, workspace …
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

### Production / preview build uchun env

`.env` fayllari EAS build'ga yuklanmaydi, shuning uchun qiymatlar EAS muhit o‘zgaruvchilarida bo‘lishi kerak (`eas.json` profillari `environment` bilan bog‘langan):

```bash
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --visibility plaintext
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value <publishable key> --visibility plaintext
npx eas-cli env:create --environment production --name EAS_PROJECT_ID --value <eas project id> --visibility plaintext
```

`EAS_PROJECT_ID` bo‘lmasa push token olinmaydi (ilovadagi Bildirishnomalar sozlamasi buni “sozlanmagan” deb ko‘rsatadi). Serverdagi push sozlamalari: ADMIN README → Push bildirishnomalar.
