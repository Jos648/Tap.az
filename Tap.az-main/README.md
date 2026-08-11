# TapAl - Backend (Gmail OTP Autentifikasiya)

## Layihə strukturu

```
tapaz/
├── server.js                  # Əsas giriş nöqtəsi (Express server)
├── package.json
├── .env                       # Mühit dəyişənləri (siz konfiqurasiya edin)
├── .env.example
├── prisma/
│   └── schema.prisma          # User modeli (Prisma)
├── config/
│   ├── prisma.js              # PrismaClient singleton
│   └── mailer.js              # Nodemailer (Gmail SMTP) + OTP e-poçt şablonu
├── routes/
│   └── auth.routes.js         # /api/auth/* endpointləri
├── controllers/
│   └── auth.controller.js     # register / login / verify-otp / resend-otp / me
├── middleware/
│   ├── auth.middleware.js     # JWT doğrulama (qorunan endpointlər üçün)
│   └── errorHandler.js        # Mərkəzləşdirilmiş xəta idarəetməsi + 404
├── utils/
│   ├── jwt.js                 # JWT sign/verify
│   ├── otp.js                 # OTP generasiyası, vaxt bitmə/cooldown hesablamaları
│   ├── validators.js          # Zod validasiya sxemləri (auth)
│   ├── apiError.js            # Statuskodlu xəta sinfi (items üçün)
│   ├── asyncHandler.js        # Async route wrapper (items üçün)
│   └── serializeItem.js       # Prisma Decimal -> number çevirmə (items üçün)
├── services/
│   └── item.service.js        # Elan CRUD-un Prisma məntiqi
├── validators/
│   └── item.validators.js     # Zod validasiya sxemləri (items)
└── public/                    # Frontend (statik fayllar)
    ├── tapal.html
    ├── script.js
    └── style.css
```

## Elanlar (Items) modulu

Bu layihə əvvəlcə ayrıca hazırlanmış `listing-data-backend-core` layihəsi ilə
birləşdirilib. Elan CRUD-u indi auth sisteminə (JWT) bağlıdır:

- `GET /api/items` — bütün elanları siyahılayır (açıq, giriş tələb olunmur). Dəstəklənən query
  parametrləri: `search`, `category`, `status`, `minPrice`, `maxPrice`, `page`, `limit`, `sort`, `order`.
- `GET /api/items/:id` — tək elanın detalı (açıq).
- `POST /api/items` — yeni elan yaradır (**giriş tələb olunur**, `Authorization: Bearer <token>`).
  Body: `title`, `description`, `price`, `category`, `location`, `images` (ən azı 3, ən çox 20 base64 şəkil).
- `PATCH /api/items/:id` — elanı yeniləyir (**giriş + sahiblik tələb olunur**).
- `DELETE /api/items/:id` — elanı silir (**giriş + sahiblik tələb olunur**).

Birləşdirmədən sonra Prisma sxeminə `Item` modeli (və `ItemStatus` enum-u) əlavə
olunub, `User` modelinə isə `items Item[]` relasiyası. **Bunu tətbiq etmək üçün DB-yə
qoşulduğunuz mühitdə (öz serverinizdə) aşağıdakı əmri işlədin:**

```bash
npx prisma migrate dev --name add_items
```

## 1. Qurulum

```bash
cd tapaz
npm install
```

`postinstall` script-i avtomatik olaraq `prisma generate` işlədəcək.

## 2. `.env` faylını konfiqurasiya edin

Layihə kökündəki `.env` faylını açıb öz məlumatlarınızla doldurun:

```env
PORT=5000
DATABASE_URL=postgresql://İSTIFADƏÇI:ŞİFRƏ@localhost:5432/tapal_db?schema=public
JWT_SECRET=uzun_tesadufi_gizli_sətir
EMAIL_USER=sizin_gmail@gmail.com
EMAIL_PASS=16_reqemli_gmail_app_parolu
```

**Gmail App Password necə alınır:**
1. Google hesabınızda 2 addımlı doğrulamanı aktivləşdirin.
2. https://myaccount.google.com/apppasswords ünvanına daxil olun.
3. "Mail" üçün 16 rəqəmli tətbiq parolu yaradın və `EMAIL_PASS`-a yapışdırın (boşluqsuz).

**PostgreSQL:** Lokal PostgreSQL server işlək olmalı və `tapal_db` adlı verilənlər bazası mövcud olmalıdır (və ya `DATABASE_URL`-i öz bazanıza uyğun dəyişin).

## 3. Verilənlər bazası miqrasiyasını işə salın

```bash
npx prisma migrate dev --name init
```

Bu, `users` cədvəlini yaradacaq.

## 4. Serveri işə salın

```bash
npm start
```

və ya inkişaf zamanı avtomatik yenidən başlatma üçün:

```bash
npm run dev
```

Server https://localhost:5000 (yəni `http://localhost:5000`) ünvanında açılacaq və frontend avtomatik olaraq `/` yolunda servis ediləcək — ayrıca Live Server-ə ehtiyac yoxdur.

## API Endpointləri

| Metod | Endpoint                  | Təsvir                                   |
|-------|----------------------------|-------------------------------------------|
| POST  | `/api/auth/register`      | Qeydiyyat, OTP kodu Gmail-ə göndərilir   |
| POST  | `/api/auth/login`         | Giriş, JWT token qaytarır                |
| POST  | `/api/auth/verify-otp`    | OTP kodunun təsdiqlənməsi                |
| POST  | `/api/auth/resend-otp`    | Yeni OTP kodu (30 saniyə cooldown)       |
| GET   | `/api/auth/me`            | Cari istifadəçi (Bearer token tələb edir)|
| GET   | `/api/health`             | Server statusu                           |

## Qeydlər

- Şifrələr `bcryptjs` ilə hash-lənir, açıq şəkildə saxlanılmır.
- OTP kodu 5 dəqiqə etibarlıdır, yenidən göndərmə üçün 30 saniyə gözləmə tələb olunur (`.env`-də tənzimlənə bilər).
- Bütün giriş datası `zod` ilə validasiya olunur.
- Elanlar (`listings`) hazırda frontend-də yaddaşda (in-memory) saxlanılır — bu, mövcud demo funksionallığıdır və auth inteqrasiyasına aid deyil.
