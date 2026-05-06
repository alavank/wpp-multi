-- =====================================================================
-- Secretarias (agrupamento de departamentos) + campos cpf/bio/secretariaId
-- nos usuários e secretariaId nos departamentos.
-- =====================================================================

-- Tabela de secretarias
CREATE TABLE "secretarias" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "deletedAt"   TIMESTAMP(3),

  CONSTRAINT "secretarias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "secretarias_name_key" ON "secretarias" ("name");

-- FK em departments
ALTER TABLE "departments"
  ADD COLUMN "secretariaId" UUID;

CREATE INDEX "departments_secretariaId_idx"
  ON "departments" ("secretariaId");

ALTER TABLE "departments"
  ADD CONSTRAINT "departments_secretariaId_fkey"
  FOREIGN KEY ("secretariaId") REFERENCES "secretarias"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Campos extras em users
ALTER TABLE "users"
  ADD COLUMN "cpf"          TEXT,
  ADD COLUMN "bio"          TEXT,
  ADD COLUMN "secretariaId" UUID;

CREATE UNIQUE INDEX "users_cpf_key" ON "users" ("cpf");
CREATE INDEX "users_secretariaId_idx" ON "users" ("secretariaId");

ALTER TABLE "users"
  ADD CONSTRAINT "users_secretariaId_fkey"
  FOREIGN KEY ("secretariaId") REFERENCES "secretarias"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- RLS
-- =====================================================================
ALTER TABLE "secretarias" ENABLE ROW LEVEL SECURITY;

-- Acesso de leitura para qualquer usuário autenticado
CREATE POLICY "secretarias_read_authenticated"
  ON "secretarias"
  FOR SELECT
  TO authenticated
  USING (true);

-- Escrita só via service role (controle por API)
CREATE POLICY "secretarias_write_service_role"
  ON "secretarias"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
