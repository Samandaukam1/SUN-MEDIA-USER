# SUN MEDIA USER

Expo React Native + TypeScript mobil ilova. `npm install`, so‘ng `npm run start`.

Simulatorsiz brauzerda ko‘rish: `npm run web`, so‘ng http://localhost:8081 ni oching.
Terminal ochiq tursin; fayllarni saqlaganingizda sahifa avtomatik yangilanadi.
To‘xtatish: Ctrl+C. Qayta ishga tushirish: `npm run web`.
Web bundle tekshiruvi: `npm run export:web`. TypeScript: `npm run typecheck`.
Brauzer ko‘rinishi interfeysni tekshirish uchun; iOS/Android funksiyalari qurilmada alohida tekshiriladi.

Development build: `npx eas-cli login`, keyin `npm run build:ios:dev` yoki `npm run build:android:dev`.

Supabase uchun faqat `.env` ichidagi `EXPO_PUBLIC_*` qiymatlari ishlatiladi. Service role kalit mobil ilovaga hech qachon kiritilmaydi.
