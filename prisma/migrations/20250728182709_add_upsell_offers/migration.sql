-- CreateTable
CREATE TABLE "UpsellOffer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "triggerProductId" TEXT NOT NULL,
    "offerProductId" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "UpsellOffer_shop_triggerProductId_key" ON "UpsellOffer"("shop", "triggerProductId");
