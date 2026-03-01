-- Composite indexes for common query patterns
CREATE INDEX "projekte_ueber_projekt_id_deleted_at_idx" ON "projekte" ("ueber_projekt_id", "deleted_at");
CREATE INDEX "arbeitspakete_projekt_id_deleted_at_idx" ON "arbeitspakete" ("projekt_id", "deleted_at");
CREATE INDEX "zuweisungen_projekt_id_deleted_at_idx" ON "zuweisungen" ("projekt_id", "deleted_at");
CREATE INDEX "zuweisungen_mitarbeiter_id_deleted_at_idx" ON "zuweisungen" ("mitarbeiter_id", "deleted_at");
CREATE INDEX "blockierungen_mitarbeiter_id_deleted_at_idx" ON "blockierungen" ("mitarbeiter_id", "deleted_at");

-- Password reset fields on users
ALTER TABLE "users" ADD COLUMN "password_reset_token" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "password_reset_expires" TIMESTAMPTZ;

-- Session log table
CREATE TABLE "session_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "email" VARCHAR(255) NOT NULL,
    "aktion" VARCHAR(50) NOT NULL,
    "ip" VARCHAR(45) NOT NULL,
    "user_agent" TEXT,
    "details" TEXT,
    "zeitpunkt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "session_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "session_logs_user_id_idx" ON "session_logs" ("user_id");
CREATE INDEX "session_logs_zeitpunkt_idx" ON "session_logs" ("zeitpunkt" DESC);

-- Dokumente table (PDF uploads)
CREATE TABLE "dokumente" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projekt_id" UUID NOT NULL,
    "name" VARCHAR(500) NOT NULL,
    "size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "data" BYTEA NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dokumente_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dokumente_projekt_id_fkey" FOREIGN KEY ("projekt_id") REFERENCES "projekte"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "dokumente_projekt_id_idx" ON "dokumente" ("projekt_id");
