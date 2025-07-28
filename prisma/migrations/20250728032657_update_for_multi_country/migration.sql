/*
  Warnings:

  - Added the required column `country` to the `ShippingRate` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShippingRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "rate" REAL NOT NULL
);
INSERT INTO "new_ShippingRate" ("city", "id", "rate", "shop") SELECT "city", "id", "rate", "shop" FROM "ShippingRate";
DROP TABLE "ShippingRate";
ALTER TABLE "new_ShippingRate" RENAME TO "ShippingRate";
CREATE UNIQUE INDEX "ShippingRate_shop_country_city_key" ON "ShippingRate"("shop", "country", "city");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
