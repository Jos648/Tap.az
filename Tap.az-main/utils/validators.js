const { z } = require('zod');

const stripTags = (val) => (typeof val === 'string' ? val.replace(/[<>]/g, '') : val);

// Yalnız @gmail.com ünvanlarına icazə verilir (frontend qaydası ilə uyğunlaşdırılıb)
const gmailSchema = z
  .string({ required_error: 'E-poçt tələb olunur.' })
  .trim()
  .toLowerCase()
  .email('Düzgün e-poçt ünvanı daxil edin.')
  .refine((val) => val.endsWith('@gmail.com'), {
    message: 'Yalnız Gmail ünvanlarına icazə verilir.',
  });

const registerSchema = z.object({
  username: z
    .string({ required_error: 'İstifadəçi adı tələb olunur.' })
    .trim()
    .min(3, 'İstifadəçi adı ən azı 3 simvol olmalıdır.')
    .max(30, 'İstifadəçi adı 30 simvoldan çox ola bilməz.')
    .transform(stripTags),
  email: gmailSchema,
  password: z
    .string({ required_error: 'Şifrə tələb olunur.' })
    .min(6, 'Şifrə ən azı 6 simvoldan ibarət olmalıdır.'),
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

const forgotPasswordSchema = z.object({
  email: gmailSchema,
});

const resetPasswordSchema = z.object({
  email: gmailSchema,
  code: z
    .string({ required_error: 'Kod tələb olunur.' })
    .trim()
    .regex(/^\d{6}$/, 'Düzgün 6 rəqəmli kod daxil edin.'),
  newPassword: z
    .string({ required_error: 'Yeni şifrə tələb olunur.' })
    .min(6, 'Şifrə ən azı 6 simvoldan ibarət olmalıdır.'),
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
  forgotPasswordSchema,
  resetPasswordSchema,
  validate,
};
