-- =====================================================================
-- RBAC granular (UserPermission) + extensões de AuditLog (IP/UA/local)
-- =====================================================================

-- New enum: Permission
CREATE TYPE "Permission" AS ENUM (
  'CONVERSATION_VIEW',
  'CONVERSATION_ASSUME',
  'CONVERSATION_FINISH',
  'CONVERSATION_REOPEN',
  'MESSAGE_SEND',
  'MESSAGE_SEND_MEDIA',
  'TRANSFER_CREATE',
  'TRANSFER_RESPOND',
  'SCHEDULED_RETURN_CREATE',
  'SCHEDULED_RETURN_CANCEL',
  'CONTACT_EDIT',
  'CONTACT_NOTE_WRITE',
  'GROUP_VIEW',
  'WHATSAPP_SESSION_MANAGE',
  'USER_MANAGE',
  'DEPARTMENT_MANAGE',
  'AUDIT_VIEW',
  'MONITOR_VIEW'
);

-- AuditLog extensions
ALTER TABLE "audit_logs"
  ADD COLUMN "actorName"    TEXT,
  ADD COLUMN "departmentId" UUID,
  ADD COLUMN "ipAddress"    TEXT,
  ADD COLUMN "userAgent"    TEXT,
  ADD COLUMN "device"       TEXT,
  ADD COLUMN "location"     TEXT;

CREATE INDEX "audit_logs_action_createdAt_idx"
  ON "audit_logs" ("action", "createdAt");
CREATE INDEX "audit_logs_createdAt_idx"
  ON "audit_logs" ("createdAt");

-- UserPermission table
CREATE TABLE "user_permissions" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId"       UUID NOT NULL,
  "permission"   "Permission" NOT NULL,
  "departmentId" UUID,
  "grantedById"  UUID,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_permissions_userId_permission_departmentId_key"
  ON "user_permissions" ("userId", "permission", "departmentId");
CREATE INDEX "user_permissions_userId_idx"
  ON "user_permissions" ("userId");

ALTER TABLE "user_permissions"
  ADD CONSTRAINT "user_permissions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
