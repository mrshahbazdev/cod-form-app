-- CreateTable
CREATE TABLE "OrderLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BlockedIp" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "OrderLog_shop_phone_idx" ON "OrderLog"("shop", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedIp_shop_ipAddress_key" ON "BlockedIp"("shop", "ipAddress");
