# Təhlükəsizlik Düzəlişləri

## ⚠️ Sən özün etməli olduqların (kod bunu avtomatik edə bilməz)

1. **Bütün sirləri dəyiş** — köhnə `.env`-də olan `DATABASE_URL`, `JWT_SECRET`,
   `EMAIL_PASS` artıq kompromis olunmuş sayılmalıdır (zip-in içində göndərilmişdi):
   - Neon-da DB şifrəsini/connection string-i dəyiş
   - Google Hesabında köhnə "App Password"-u ləğv edib yenisini yarat
   - Yeni, təsadüfi 32+ simvollu `JWT_SECRET` yarat (məs. `openssl rand -hex 32`)
2. `.env.example`-dən öz `.env`-ini yenidən qur, yeni dəyərlərlə doldur.
3. `npm install` çalışdır — `express-rate-limit` yeni asılılıqdır.
4. Əgər bu layihə artıq GitHub-a push olunubsa, `.env` git tarixçəsində qala bilər —
   `git log --all --full-history -- .env` ilə yoxla, lazım gələrsə
   `git filter-repo` (və ya BFG) ilə tarixçədən təmizlə və force-push et.
5. Production-da `NODE_ENV=production` təyin et (error handler bundan asılıdır).

## ✅ Kodda edilən dəyişikliklər

| Fayl | Dəyişiklik |
|---|---|
| `.gitignore` (yeni) | `.env`, `node_modules/` və s. artıq commit olunmayacaq |
| `.env.example` (yeni) | Real dəyər yoxdur, yalnız şablon |
| `package.json` | `express-rate-limit` əlavə olundu |
| `middleware/rateLimit.middleware.js` (yeni) | login/register/OTP endpoint-ləri üçün brute-force limiterlər |
| `server.js` | Bütün `/api/*` üçün ümumi rate limit qatı |
| `routes/auth.routes.js` | Limiterlər route-lara bağlandı |
| `utils/otp.js` | `Math.random()` → `crypto.randomInt()` (proqnozlaşdırıla bilməyən OTP) |
| `utils/validators.js` | Şifrə: min 8 simvol + böyük/kiçik hərf/rəqəm tələbi; username-də `< > " ' &` qadağan |
| `controllers/auth.controller.js` | `SALT_ROUNDS` artıq `.env`-dən oxunur, default 12 (əvvəl sabit 10) |
| `middleware/errorHandler.js` | `NODE_ENV=production`-da 500 xətalarının daxili mesajı client-ə göndərilmir |
| `public/script.js` | **Stored XSS düzəldildi**: `escapeHtml()`, `escapeForInlineHandler()`, `sanitizeMediaUrl()` əlavə olundu və elan başlığı/açıqlama/username/rəy şərhi/şəkil-video URL-ləri kimi bütün istifadəçi məlumatı bu funksiyalardan keçirilərək `innerHTML`-ə yazılır |

## Qeyd olunan, hələ tətbiq edilməyən (istəsən sonra edə bilərik)

- JWT tək, uzunmüddətli (7 gün) access token — refresh token / logout-la ləğv mexanizmi yoxdur
- `helmet`-in CSP-si tam deaktivdir (`contentSecurityPolicy: false`) — inline `onclick` handler-lər buna görə saxlanılıb; uzunmüddətdə CSP-ni aktivləşdirib inline event handler-ləri `addEventListener`-ə köçürmək daha güclü XSS müdafiəsi verər
