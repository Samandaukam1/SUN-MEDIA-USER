# SUN MEDIA Preview — jamoa iPhone’lari

## Hozirgi holat (2026-09-30)

- Web preview cloud bilan ishlaydi: https://samandaukam1.github.io/SUN-MEDIA-USER/ (Supabase “Sun Media”, 39/39 migratsiya).
- Test rollari cloud’da: Admin, Rahbar, Montajyor, Mijoz (SAFI). Parolni jamoaga shaxsan bering; production’dan oldin almashtiring.
- iOS/Android build: EAS profillari tayyor (development / preview / production); Apple Developer va Expo login kutilmoqda.
- Google, Meta, Apple, Play, SMTP va admin panel hosting qadamlari: ADMIN repo → `docs/PRODUCTION_SETUP.md`.

## Saqlangan va qo‘shilgan config

- Expo SDK 54; iOS bundle ID **com.sunmedia.user** saqlandi.
- Preview app nomi **SUN MEDIA Preview**. Bir xil bundle ID sabab shu qurilmadagi SUN MEDIA installini almashtiradi; parallel alohida app emas.
- `preview`: internal distribution, release app (`developmentClient: false`), real device (`simulator: false`), EAS `preview` environment/channel.
- `expo-updates` SDK 54 bilan mos versiyada o‘rnatildi. Preview uchun haqiqiy project ID berilgach `https://u.expo.dev/<EAS_PROJECT_ID>` va `fingerprint` runtime ishlatiladi. Preview channelning serverdagi yaratilishi hali bajarilmagan.
- Production build profili saqlandi; production OTA bu taskda yoqilmagan.
- `__DEV__` quick login o‘zgarmadi: preview release’da yashirin. Jamoa haqiqiy Supabase email/paroli bilan kiradi.
- Preview build/update local `.env`/`.env.local` fayllarini yuklamaydi. Guard localhost/LAN URL va service-role/secret kalitlarni rad etadi. Build hook va update preflight majburiy public config va real EAS UUID’ni talab qiladi.
- Native loyihalar gitignore’da: EAS ularni mavjud Expo config/pluginlardan generatsiya qiladi. Lokal `ios/` qayta yozilmadi.

## Bir martalik human setup

1. Ushbu repoda Expo akkauntingizga brauzer orqali kiring (parol/2FA’ni chat yoki repoga qo‘ymang):

   ```sh
   npx --yes eas-cli@24.8.0 login
   npx --yes eas-cli@24.8.0 whoami
   ```

2. Expo account/organization va mavjud projectni tasdiqlang. Mavjud project uchun `eas project:init --id <haqiqiy-project-uuid>`; project yo‘q bo‘lsa faqat owner tasdiqlangach interaktiv `eas project:init`. Dynamic app config real `EAS_PROJECT_ID` va `EXPO_OWNER` environment qiymatlaridan foydalanadi.

3. `env/preview.example` ni gitignore qilingan `.env.preview.upload` ga nusxalang va haqiqiy qiymatlarni kiriting. Cloud uchun mavjud `.env` dagi **public anon** kalitni reuse qilish mumkin. `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, Apple paroli, login parollari yoki Expo tokenini bu faylga qo‘ymang.

   EAS projectni topish uchun quyidagi **ommaviy** metadata qiymatlarini build/update terminalida ham export qiling:

   ```sh
   export EAS_PROJECT_ID=<haqiqiy-project-uuid>
   export EXPO_OWNER=<tasdiqlangan-expo-account>
   EXPO_NO_DOTENV=1 npx --yes eas-cli@24.8.0 env:push preview --path .env.preview.upload
   ```

   `APP_VARIANT=preview`, `EXPO_NO_DOTENV=1`, public Supabase URL/key, `EAS_PROJECT_ID`, `EXPO_OWNER` EAS **preview** environment’da bo‘lishi kerak. Public qiymatlar build/update CLI o‘qiy oladigan plaintext/sensitive visibility’da saqlanadi, secret visibility’da emas.

4. Cloud loyihani preview uchun ishlatishni tasdiqlang yoki boshqa staging loyiha bering. Tasdiqdan keyin ADMIN’dagi mavjud migratsiyalarni qo‘llash, mavjud Auth akkauntini saqlash va kamida Admin/Rahbar/Montajyor/Mijoz uchun xavfsiz login provisioning zarur. To‘liq demo seedni cloud’ga ko‘chirmang; lokal umumiy test parolini cloud’da ishlatmang.

   Lokal reuse qilinadigan rollar: `admin@sunmedia.local` → Admin, `owner@sunmedia.local` → Rahbar, `editor@sunmedia.local` → Montajyor, `safi@client.local` → Mijoz. Bular hozir **faqat lokal**; cloud loginlari deb jamoaga yubormang. System owner faqat web uchun.

5. Paid Apple Developer account/team bilan signing’ni tasdiqlang. Team a’zolari builddan **oldin** iPhone’larini ro‘yxatdan o‘tkazadi:

   ```sh
   npm run devices:register
   npm run devices:list
   ```

   `device:create` ko‘rsatgan registration URL/QR’ni jamoaga yuboring. Linkni har kim o‘z iPhone’ida Safari orqali ochib, UDID ro‘yxatdan o‘tishini tugatadi. Apple login/2FA yoki yangi identifier tasdig‘i so‘ralsa egasi o‘zi bajaradi. Existing `com.sunmedia.user` saqlanadi.

## Build va install

Cloud setup, Expo project, Apple signing va qurilmalar tayyor bo‘lgach:

```sh
npm run build:ios:preview
```

Interaktiv build barcha ro‘yxatdagi jamoa qurilmalarini provisioning profile’ga qo‘shsin. Build muvaffaqiyatli tugagach EAS bergan **haqiqiy** build/install URL’ni yuboring. Keyin qo‘shilgan iPhone uchun yangi provisioning bilan qayta build yoki `eas build:resign` talab qilinadi.

Telegram matni (URL chiqqandan keyin to‘ldiriladi):

> SUN MEDIA PREVIEW
>
> Avval yuborilgan registration link orqali iPhone’ingizni ro‘yxatdan o‘tkazing.
> O‘rnatish: [EAS bergan install link]
> Linkni iPhone’da Safari bilan oching va Install bosing.
> Sizga alohida berilgan login/parol bilan kiring.
> Muammo topsangiz: ekran nomi, bajargan amalingiz va screenshotni yuboring.

## Keyingi JS/TS update

```sh
npm run update:preview -- "Preview tuzatish tavsifi"
```

Bu command remote **preview** environment’ni yuklaydi, majburiy config tekshiruvini bajaradi va faqat **preview** kanaliga iOS update yuboradi. To‘g‘ri EAS project ID/owner terminalda mavjud bo‘lsin. Native dependency/config yoki Expo SDK o‘zgarsa fingerprint o‘zgaradi va yangi iOS build kerak. OTA compatible update qurilmaga yuklangach keyingi app ochilishida qo‘llanadi.

## Minimal tekshiruv va manbalar

TypeScript, Expo public config, EAS CLI schema validatsiyasi va localhost/missing-config guardlari tekshirildi. Signed iOS build, real-device QA va real OTA delivery hali Expo/Apple/cloud setup sabab tekshirilmagan. Katta test suite yoki simulator walkthrough bajarilmadi.

[Expo internal distribution](https://docs.expo.dev/build/internal-distribution/), [EAS Update setup](https://docs.expo.dev/eas-update/getting-started/), [runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/), [EAS environment variables](https://docs.expo.dev/eas/environment-variables/usage/).
