-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "UnternehmensTyp" AS ENUM ('grossunternehmen', 'kmu');

-- CreateEnum
CREATE TYPE "ProjektStatus" AS ENUM ('geplant', 'aktiv', 'abgeschlossen');

-- CreateEnum
CREATE TYPE "APStatus" AS ENUM ('offen', 'in_bearbeitung', 'abgeschlossen');

-- CreateEnum
CREATE TYPE "BlockierungsTyp" AS ENUM ('urlaub', 'krank');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "refresh_token" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "last_login" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ueber_projekte" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "beschreibung" TEXT,
    "unternehmens_typ" "UnternehmensTyp" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "ueber_projekte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projekte" (
    "id" UUID NOT NULL,
    "ueber_projekt_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "beschreibung" TEXT,
    "status" "ProjektStatus" NOT NULL DEFAULT 'geplant',
    "start_datum" DATE,
    "end_datum" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "projekte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arbeitspakete" (
    "id" UUID NOT NULL,
    "projekt_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "beschreibung" TEXT,
    "status" "APStatus" NOT NULL DEFAULT 'offen',
    "start_datum" DATE,
    "end_datum" DATE,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "arbeitspakete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mitarbeiter" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" VARCHAR(255),
    "wochen_stunden" DECIMAL(4,1) NOT NULL DEFAULT 40,
    "jahres_urlaub" INTEGER NOT NULL DEFAULT 30,
    "jahresgehalt" DECIMAL(12,2),
    "lohnnebenkosten" DECIMAL(12,2),
    "feiertage_pflicht" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "mitarbeiter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockierungen" (
    "id" UUID NOT NULL,
    "mitarbeiter_id" UUID NOT NULL,
    "von" DATE NOT NULL,
    "bis" DATE NOT NULL,
    "typ" "BlockierungsTyp" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "blockierungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zuweisungen" (
    "id" UUID NOT NULL,
    "mitarbeiter_id" UUID NOT NULL,
    "projekt_id" UUID NOT NULL,
    "ueber_projekt_id" UUID NOT NULL,
    "prozent_anteil" DECIMAL(5,2) NOT NULL,
    "von" DATE NOT NULL,
    "bis" DATE NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "zuweisungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ap_verteilung" (
    "id" UUID NOT NULL,
    "zuweisung_id" UUID NOT NULL,
    "arbeitspaket_id" UUID NOT NULL,
    "prozent_anteil" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "ap_verteilung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feiertage" (
    "id" UUID NOT NULL,
    "datum" DATE NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "feiertage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aenderungs_log" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "zeitpunkt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktion" VARCHAR(50) NOT NULL,
    "entitaet" VARCHAR(100) NOT NULL,
    "entitaet_id" UUID NOT NULL,
    "name" VARCHAR(255),
    "details" TEXT,
    "vorher_json" JSONB,
    "nachher_json" JSONB,

    CONSTRAINT "aenderungs_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_log" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "dokument_nummer" VARCHAR(20) NOT NULL,
    "typ" VARCHAR(50) NOT NULL,
    "referenz_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zeitraum_von" DATE,
    "zeitraum_bis" DATE,
    "daten_hash" VARCHAR(64) NOT NULL,

    CONSTRAINT "export_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_counter" (
    "jahr" INTEGER NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "export_counter_pkey" PRIMARY KEY ("jahr")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "ueber_projekte_deleted_at_idx" ON "ueber_projekte"("deleted_at");

-- CreateIndex
CREATE INDEX "projekte_ueber_projekt_id_idx" ON "projekte"("ueber_projekt_id");

-- CreateIndex
CREATE INDEX "projekte_deleted_at_idx" ON "projekte"("deleted_at");

-- CreateIndex
CREATE INDEX "arbeitspakete_projekt_id_idx" ON "arbeitspakete"("projekt_id");

-- CreateIndex
CREATE INDEX "arbeitspakete_parent_id_idx" ON "arbeitspakete"("parent_id");

-- CreateIndex
CREATE INDEX "arbeitspakete_deleted_at_idx" ON "arbeitspakete"("deleted_at");

-- CreateIndex
CREATE INDEX "mitarbeiter_deleted_at_idx" ON "mitarbeiter"("deleted_at");

-- CreateIndex
CREATE INDEX "blockierungen_mitarbeiter_id_idx" ON "blockierungen"("mitarbeiter_id");

-- CreateIndex
CREATE INDEX "blockierungen_deleted_at_idx" ON "blockierungen"("deleted_at");

-- CreateIndex
CREATE INDEX "zuweisungen_mitarbeiter_id_idx" ON "zuweisungen"("mitarbeiter_id");

-- CreateIndex
CREATE INDEX "zuweisungen_projekt_id_idx" ON "zuweisungen"("projekt_id");

-- CreateIndex
CREATE INDEX "zuweisungen_ueber_projekt_id_idx" ON "zuweisungen"("ueber_projekt_id");

-- CreateIndex
CREATE INDEX "zuweisungen_deleted_at_idx" ON "zuweisungen"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "ap_verteilung_zuweisung_id_arbeitspaket_id_key" ON "ap_verteilung"("zuweisung_id", "arbeitspaket_id");

-- CreateIndex
CREATE UNIQUE INDEX "feiertage_datum_key" ON "feiertage"("datum");

-- CreateIndex
CREATE INDEX "aenderungs_log_zeitpunkt_idx" ON "aenderungs_log"("zeitpunkt" DESC);

-- CreateIndex
CREATE INDEX "aenderungs_log_entitaet_entitaet_id_idx" ON "aenderungs_log"("entitaet", "entitaet_id");

-- CreateIndex
CREATE UNIQUE INDEX "export_log_dokument_nummer_key" ON "export_log"("dokument_nummer");

-- AddForeignKey
ALTER TABLE "ueber_projekte" ADD CONSTRAINT "ueber_projekte_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ueber_projekte" ADD CONSTRAINT "ueber_projekte_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projekte" ADD CONSTRAINT "projekte_ueber_projekt_id_fkey" FOREIGN KEY ("ueber_projekt_id") REFERENCES "ueber_projekte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projekte" ADD CONSTRAINT "projekte_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projekte" ADD CONSTRAINT "projekte_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arbeitspakete" ADD CONSTRAINT "arbeitspakete_projekt_id_fkey" FOREIGN KEY ("projekt_id") REFERENCES "projekte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arbeitspakete" ADD CONSTRAINT "arbeitspakete_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "arbeitspakete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arbeitspakete" ADD CONSTRAINT "arbeitspakete_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mitarbeiter" ADD CONSTRAINT "mitarbeiter_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mitarbeiter" ADD CONSTRAINT "mitarbeiter_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockierungen" ADD CONSTRAINT "blockierungen_mitarbeiter_id_fkey" FOREIGN KEY ("mitarbeiter_id") REFERENCES "mitarbeiter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockierungen" ADD CONSTRAINT "blockierungen_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zuweisungen" ADD CONSTRAINT "zuweisungen_mitarbeiter_id_fkey" FOREIGN KEY ("mitarbeiter_id") REFERENCES "mitarbeiter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zuweisungen" ADD CONSTRAINT "zuweisungen_projekt_id_fkey" FOREIGN KEY ("projekt_id") REFERENCES "projekte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zuweisungen" ADD CONSTRAINT "zuweisungen_ueber_projekt_id_fkey" FOREIGN KEY ("ueber_projekt_id") REFERENCES "ueber_projekte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zuweisungen" ADD CONSTRAINT "zuweisungen_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zuweisungen" ADD CONSTRAINT "zuweisungen_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ap_verteilung" ADD CONSTRAINT "ap_verteilung_zuweisung_id_fkey" FOREIGN KEY ("zuweisung_id") REFERENCES "zuweisungen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ap_verteilung" ADD CONSTRAINT "ap_verteilung_arbeitspaket_id_fkey" FOREIGN KEY ("arbeitspaket_id") REFERENCES "arbeitspakete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aenderungs_log" ADD CONSTRAINT "aenderungs_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_log" ADD CONSTRAINT "export_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

