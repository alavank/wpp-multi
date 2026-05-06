-- =====================================================================
-- Estrutura organizacional flexível em árvore (Organização → Secretaria
-- → Departamento → Setor → …). Uma única tabela `departments` com
-- self-reference (`parentId`) e `kind` textual livre.
-- A tabela `secretarias` é absorvida e dropada. `users.secretariaId` sai.
-- =====================================================================

-- 1) Novas colunas em departments
ALTER TABLE "departments"
  ADD COLUMN "parentId" UUID,
  ADD COLUMN "kind"     TEXT NOT NULL DEFAULT 'DEPARTAMENTO';

-- whatsappNumber passa a ser opcional (só nós que recebem fila têm número)
ALTER TABLE "departments"
  ALTER COLUMN "whatsappNumber" DROP NOT NULL;

-- 2) Migra `secretarias` → `departments` como nós kind=SECRETARIA
INSERT INTO "departments" (
  "id", "name", "description", "isActive", "kind",
  "createdAt", "updatedAt", "deletedAt"
)
SELECT
  "id", "name", "description", "isActive", 'SECRETARIA',
  "createdAt", "updatedAt", "deletedAt"
FROM "secretarias";

-- 3) Departments existentes que apontavam para uma secretaria via
-- `secretariaId` ganham o `parentId` correspondente (mesmo UUID).
UPDATE "departments"
SET "parentId" = "secretariaId"
WHERE "secretariaId" IS NOT NULL;

-- 4) FK + índice para a self-reference
ALTER TABLE "departments"
  ADD CONSTRAINT "departments_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "departments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "departments_parentId_idx" ON "departments" ("parentId");
CREATE INDEX "departments_kind_idx"     ON "departments" ("kind");

-- 5) Remove a antiga FK e a coluna `secretariaId` em departments
ALTER TABLE "departments"
  DROP CONSTRAINT IF EXISTS "departments_secretariaId_fkey";
DROP INDEX IF EXISTS "departments_secretariaId_idx";
ALTER TABLE "departments" DROP COLUMN "secretariaId";

-- 6) Remove `secretariaId` de users (agora vínculo é só via DepartmentMember)
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_secretariaId_fkey";
DROP INDEX IF EXISTS "users_secretariaId_idx";
ALTER TABLE "users" DROP COLUMN "secretariaId";

-- 7) Dropa a tabela secretarias (já migrada)
DROP TABLE "secretarias";
