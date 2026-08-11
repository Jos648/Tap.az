-- Şifrə bərpası üçün OTP sahələri
ALTER TABLE "users" ADD COLUMN "resetOtpCode" TEXT;
ALTER TABLE "users" ADD COLUMN "resetOtpExpiresAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "resetOtpResendAt" TIMESTAMP(3);
