-- CreateTable
CREATE TABLE "IpOrderLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "otpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twilioAccountSid" TEXT,
    "twilioAuthToken" TEXT,
    "twilioPhoneNumber" TEXT,
    "twilioVerifySid" TEXT,
    "orderSpamProtectionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "orderSpamTimeLimit" INTEGER DEFAULT 5,
    "autoIpBlockingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ipBlockAttemptLimit" INTEGER DEFAULT 3,
    "ipBlockTimeFrame" INTEGER DEFAULT 5
);
INSERT INTO "new_AppSettings" ("id", "orderSpamProtectionEnabled", "orderSpamTimeLimit", "otpEnabled", "shop", "twilioAccountSid", "twilioAuthToken", "twilioPhoneNumber", "twilioVerifySid") SELECT "id", "orderSpamProtectionEnabled", "orderSpamTimeLimit", "otpEnabled", "shop", "twilioAccountSid", "twilioAuthToken", "twilioPhoneNumber", "twilioVerifySid" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
CREATE UNIQUE INDEX "AppSettings_shop_key" ON "AppSettings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "IpOrderLog_shop_ipAddress_idx" ON "IpOrderLog"("shop", "ipAddress");
