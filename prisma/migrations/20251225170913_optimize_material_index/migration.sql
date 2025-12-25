/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Material` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Material_name_key" ON "Material"("name");

-- CreateIndex
CREATE INDEX "Material_isActive_name_idx" ON "Material"("isActive", "name");
