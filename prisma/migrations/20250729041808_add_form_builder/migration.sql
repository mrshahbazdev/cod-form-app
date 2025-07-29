-- CreateTable
CREATE TABLE "FormField" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "placeholder" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "FormField_shop_idx" ON "FormField"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_shop_name_key" ON "FormField"("shop", "name");
