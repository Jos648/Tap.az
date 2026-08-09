const { z } = require('zod');

// Yalnız @gmail.com ünvanlarına icazə verilir (frontend qaydası ilə uyğunlaşdırılıb)
const gmailSchema = z
  .string({ required_error: 'E-poçt tələb olunur.' })
  .trim()
  .toLowerCase()
  .email('Düzgün e-poçt ünvanı daxil edin.')
  .refine((val) => val.endsWith('@gmail.com'), {
    message: 'Yalnız Gmail ünvanlarına icazə verilir.',
  });

// İstifadəçi adında HTML/skript inyeksiyasına imkan verə biləcək simvollara
// (< > " ' &) icazə verilmir — server-side ilk müdafiə xətti, frontend-dəki
// escapeHtml() ikinci qatdır.
const usernameSchema = z
  .string({ required_error: 'İstifadəçi adı tələb olunur.' })
  .trim()
  .min(3, 'İstifadəçi adı ən azı 3 simvol olmalıdır.')
  .max(30, 'İstifadəçi adı 30 simvoldan çox ola bilməz.')
  .regex(/^[^<>"'&]*$/, 'İstifadəçi adında < > " \' & simvollarına icazə verilmir.');

const passwordSchema = z
  .string({ required_error: 'Şifrə tələb olunur.' })
  .min(8, 'Şifrə ən azı 8 simvoldan ibarət olmalıdır.')
  .max(72, 'Şifrə 72 simvoldan çox ola bilməz.') // bcrypt 72 baytdan sonrasını görməzdən gəlir
  .regex(/[a-z]/, 'Şifrədə ən azı bir kiçik hərf olmalıdır.')
  .regex(/[A-Z]/, 'Şifrədə ən azı bir böyük hərf olmalıdır.')
  .regex(/[0-9]/, 'Şifrədə ən azı bir rəqəm olmalıdır.');

const registerSchema = z.object({
  username: usernameSchema,
  email: gmailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: gmailSchema,
  password: z.string({ required_error: 'Şifrə tələb olunur.' }).min(1, 'Şifrə tələb olunur.'),
});

const verifyOtpSchema = z.object({
  email: gmailSchema,
  code: z
    .string({ required_error: 'Kod tələb olunur.' })
    .trim()
    .regex(/^\d{6}$/, 'Düzgün 6 rəqəmli kod daxil edin.'),
});

const resendOtpSchema = z.object({
  email: gmailSchema,
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors[0]?.message || 'Yanlış məlumat.';
      return res.status(400).json({ success: false, message });
    }
    req.body = result.data;
    next();
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  validate,
};
