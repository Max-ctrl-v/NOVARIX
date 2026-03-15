-- CreateEnum
CREATE TYPE "rechtsform" AS ENUM ('gmbh', 'gmbh_co_kg');

-- AlterTable
ALTER TABLE "ueber_projekte" ADD COLUMN "rechtsform" "rechtsform" NOT NULL DEFAULT 'gmbh';

-- CreateTable
CREATE TABLE "kommandisten" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ueber_projekt_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "anteil_prozent" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    CONSTRAINT "kommandisten_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kommandisten_ueber_projekt_id_idx" ON "kommandisten"("ueber_projekt_id");

-- AddForeignKey
ALTER TABLE "kommandisten" ADD CONSTRAINT "kommandisten_ueber_projekt_id_fkey" FOREIGN KEY ("ueber_projekt_id") REFERENCES "ueber_projekte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
