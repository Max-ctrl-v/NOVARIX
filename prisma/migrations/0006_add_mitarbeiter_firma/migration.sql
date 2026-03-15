-- AlterTable
ALTER TABLE "mitarbeiter" ADD COLUMN "ueber_projekt_id" UUID;

-- CreateIndex
CREATE INDEX "mitarbeiter_ueber_projekt_id_idx" ON "mitarbeiter"("ueber_projekt_id");

-- AddForeignKey
ALTER TABLE "mitarbeiter" ADD CONSTRAINT "mitarbeiter_ueber_projekt_id_fkey" FOREIGN KEY ("ueber_projekt_id") REFERENCES "ueber_projekte"("id") ON DELETE SET NULL ON UPDATE CASCADE;
