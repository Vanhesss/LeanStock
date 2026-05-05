-- AlterTable
ALTER TABLE "users" ADD COLUMN "is_email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "email_verification_token" TEXT;
ALTER TABLE "users" ADD COLUMN "email_verification_expires" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "password_reset_token" TEXT;
ALTER TABLE "users" ADD COLUMN "password_reset_expires" TIMESTAMP(3);
