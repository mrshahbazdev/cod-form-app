/*
  Warnings:

  - You are about to drop the `OtpLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN "twilioVerifySid" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OtpLog";
PRAGMA foreign_keys=on;
