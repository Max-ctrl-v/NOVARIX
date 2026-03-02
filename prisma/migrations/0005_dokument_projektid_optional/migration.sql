-- AlterTable: make projekt_id nullable on dokumente
ALTER TABLE "dokumente" ALTER COLUMN "projekt_id" DROP NOT NULL;
