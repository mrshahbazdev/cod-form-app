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
    "orderSpamTimeLimit" INTEGER DEFAULT 5
);
INSERT INTO "new_AppSettings" ("id", "otpEnabled", "shop", "twilioAccountSid", "twilioAuthToken", "twilioPhoneNumber", "twilioVerifySid") SELECT "id", "otpEnabled", "shop", "twilioAccountSid", "twilioAuthToken", "twilioPhoneNumber", "twilioVerifySid" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
CREATE UNIQUE INDEX "AppSettings_shop_key" ON "AppSettings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
