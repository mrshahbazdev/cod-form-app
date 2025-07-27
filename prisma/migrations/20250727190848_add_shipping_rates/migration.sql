-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "rate" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRate_shop_city_key" ON "ShippingRate"("shop", "city");
