-- AlterTable
ALTER TABLE "projekte" ADD COLUMN "soll_kosten" DECIMAL(12,2);
ALTER TABLE "projekte" ADD COLUMN "bescheinigte_kosten" DECIMAL(12,2);
ALTER TABLE "projekte" ADD COLUMN "foerdersatz" DECIMAL(5,2);
ALTER TABLE "projekte" ADD COLUMN "foerdersumme" DECIMAL(12,2);
ALTER TABLE "projekte" ADD COLUMN "honorar_prozent" DECIMAL(5,2);
ALTER TABLE "projekte" ADD COLUMN "honorar" DECIMAL(12,2);
