# SUN MEDIA — UX audit va soddalashtirish (2026-09-28)

Audit real ekranlarda o‘tkazildi: iOS Simulator (Owner, Operator, Mijoz rahbari) va brauzerdagi admin panel (Owner). Maqsad: funksiyani yo‘qotmasdan, har bir odam faqat o‘ziga keragini ko‘rsin va birinchi ochishda qayerga bosishni tushunsin.

## Topilgan muammolar

### Mobil

| Joy | Muammo |
|---|---|
| Navigatsiya | Boshqaruv interfeysida birinchi tab “Dashboard” (inglizcha), qolganlarida “Bosh sahifa” — bir xil joy ikki xil nomda. |
| Owner Home | Bitta ekranda ~20 ta raqam: hero (4), davomat (5 + 9 avatar), muddatlar (3), tasdiqlash (3), nashrlar (3), har mijoz uchun 4 ta. “Overdue”, “Revision”, “Ichki tekshiruv” kabi so‘zlar. Kechikish 3 joyda takrorlanadi. |
| Xodim Home | 0/0/0/0 hisoblagichlar, xodim hech narsa qila olmaydigan “Bugungi davomat · Administrator belgilaydi” qatori. Bugungi syomka va vazifa pastda. |
| Mijoz Home | 4 ekran uzunlikda: tarif ro‘yxati, 8 kishilik jamoa, bildirishnomalar (Xabarlar’da ham bor). Tasdiqlash kutayotgan video pastda qolib ketgan. |
| Studiya | Mijozga ichki ma’lumotlar ko‘rinadi: “Montaj: Jasur”, “Ichki tekshiruv”, “1 revision”. Kartada 7 xil ma’lumot (platforma, raqam, progress, avatarlar, jamoa, muddat, nashr). Fayllar tugmasi Akkaunt’dagini takrorlaydi. |
| Kontent detail | 10 ta bo‘lim (Umumiy, Ssenariy, Media, Jamoa, Timeline, Tasdiqlash, Revision, Nashr, Izohlar, Tarix). |
| Xabarlar | “Tasdiqlar” / “Revision” nomlari; tasdiqlash markazi Akkaunt’da ham takrorlangan. |
| Akkaunt | Xodimda 17 qator. Operator mijozlar va loyihalar ro‘yxatini ko‘radi. “Til” va “Mavzu” qatorlari bosilmaydi. |
| Nomlar | Rollar inglizcha (Owner, Project Manager, SMM Manager, Client Owner, Editor / Montajyor), “Account manager”, papkalar “RAW / EDITED / APPROVED”. |
| Davomat | Har xodim uchun alohida oyna ochish kerak — 9 kishini belgilash uzoq. |

### Admin panel

| Joy | Muammo |
|---|---|
| Sidebar | “Boshqaruv / Odamlar / Tizim” guruhlari mantiqsiz: Tariflar “Boshqaruv”da, Mijozlar “Odamlar”da. “Dashboard”, “Audit log” inglizcha. |
| Qamrov | Kontent, kalendar, syomka, vazifa, tasdiqlash, fayllar, davomat, KPI, loyihalar, shartnomalar va hisobotlar admin panelda umuman yo‘q — faqat telefonda. |
| Bosh sahifa | “OVERDUE” sarlavhasi, davomat ro‘yxati 9 ta “Belgilanmagan” qatori bilan ekranning yarmini egallaydi. |
| Rollar | Texnik kalitlar (`clients.manage`), “RLS”, “Command Center” ko‘rinadi. Rol nomlari inglizcha. |
| Yaratish | “Xodim qo‘shish”, “Mijoz qo‘shish”, “Yangi tarif”, “E’lon”, “Tadbir”, “Hujjat” — har sahifada alohida tugma, umumiy “+ Yaratish” yo‘q. |
| Xodim qo‘shish | Hamma maydon bitta oynada; yaratilgandan keyin login/parolni nusxalash noqulay. |
| Qidiruv / yo‘l | Global qidiruv va “qayerdaman” (breadcrumb) yo‘q. |

## Qarorlar

**Nomlar (hamma joyda bir xil):**
- Rollar: Rahbar, Direktor, Administrator, Loyiha menejeri, SMM menejer, Operator, Montajyor, Dizayner, Kopirayter, Mijoz rahbari, Mijoz xodimi.
- Kontent holatlari: G‘oya → Ssenariy → Syomkaga tayyor → Syomka → Suratga olindi → Montaj → Tekshiruv → Mijoz tasdiqlashi → O‘zgartirish → Tayyor → Rejalashtirilgan → Joylandi.
- Mijozga ichki bosqichlar ko‘rsatilmaydi: tekshiruv “Montaj”, o‘zgartirish esa “Qayta ishlanmoqda” bo‘lib ko‘rinadi.
- Kalendar: Syomka, Montaj, Tasdiqlash, Post, Uchrashuv, Muddat.

**Mobil — 5 tab: Bosh sahifa / Kalendar / Studiya / Xabarlar / Akkaunt.**
- Bosh sahifa — “bugun nima bor”:
  - Rahbar va admin: BUGUN (6 ko‘rsatkich), syomkalar, muhim muddatlar, tasdiqlash, faollik.
  - Xodim: bugungi reja vaqti bilan, vazifalarim, o‘zgartirish so‘ralganlar, keyingi syomka, e’lonlar.
  - Mijoz: tasdiqlashingiz kerak, bugun, keyingi syomka, tayyorlanmoqda, bu oy.
- Studiya: kartada faqat rasm, nom, mijoz, holat va muddat. Kontent sahifasida 6 bo‘lim: Asosiy / Ssenariy / Media / Jamoa / Tasdiqlash / Tarix. Mijozda Jamoa va Tarix bo‘limlari yo‘q.
- Xabarlar: 3 bo‘lim — Xabarlar / Tasdiqlashlar / Bildirishnomalar.
- Akkaunt:
  - Xodim: Mening ishim, Jamoa uchun, Boshqaruv (faqat ruxsati borlarga), Sozlamalar.
  - Mijoz: Mening tarifim, Oylik hisobotlar, Fayllar, Jamoangiz, Sozlamalar.
- Davomat: har xodim yonida Keldi / Kechikdi / Kelmadi tugmalari.

**Admin — 6 bo‘lim:**

| Bo‘lim | Ichida |
|---|---|
| Bosh sahifa | BUGUN ko‘rsatkichlari, syomkalar, muhim muddatlar, so‘nggi faollik |
| Ish jarayoni | Kontent, Kalendar, Syomkalar, Vazifalar, Tasdiqlashlar, Fayllar |
| Mijozlar | Barcha mijozlar, Loyihalar, Tariflar, Shartnomalar |
| Jamoa | Xodimlar, Davomat, Ish samaradorligi, Rollar va ruxsatlar, Akkauntlar, E’lonlar |
| Hisobotlar | Mijozlar hisoboti, Oylik natijalar, Xodimlar KPI, Agentlik statistikasi |
| Sozlamalar | Umumiy sozlamalar, Faoliyat tarixi |

- Butun panel uchun bitta “+ Yaratish” tugmasi, global qidiruv va breadcrumb.
- Xodim qo‘shish 4 bosqichda; oxirida login va parolni nusxalash tugmalari.

Backend mantig‘i o‘zgarmaydi: yangi ekranlar mavjud RPC va RLS’dan foydalanadi.
