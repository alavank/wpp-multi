/**
 * Cria (ou atualiza) o primeiro SUPER_ADMIN:
 *  1. Garante o usuário em auth.users (Supabase Admin SDK).
 *  2. Espelha em public.users com role=SUPER_ADMIN.
 *
 * Uso: pnpm --filter @wpp/api exec tsx scripts/bootstrap-admin.ts
 */
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PRIMARY_EMAIL",
  "PRIMARY_PASSWORD",
  "PRIMARY_FULL_NAME",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[bootstrap-admin] variável ${key} ausente no .env`);
    process.exit(1);
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EMAIL = process.env.PRIMARY_EMAIL!;
const PASSWORD = process.env.PRIMARY_PASSWORD!;
const FULL_NAME = process.env.PRIMARY_FULL_NAME!;

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const prisma = new PrismaClient();

  // 1) Tenta criar; se já existe, recupera por listagem.
  let userId: string | undefined;
  const create = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: FULL_NAME },
    app_metadata: { role: "SUPER_ADMIN" },
  });

  if (create.error) {
    if (
      /already (been )?registered/i.test(create.error.message) ||
      /User already registered/i.test(create.error.message)
    ) {
      // já existe — busca pelo email
      const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
      if (error) throw error;
      const existing = data.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
      if (!existing) throw new Error("Usuário existe mas não foi encontrado na listagem.");
      userId = existing.id;

      // Garante app_metadata.role e atualiza senha caso tenha mudado.
      await supabase.auth.admin.updateUserById(userId, {
        password: PASSWORD,
        user_metadata: { full_name: FULL_NAME },
        app_metadata: { role: "SUPER_ADMIN" },
      });
      console.log(`[bootstrap-admin] auth.users já existia — atualizado (id=${userId})`);
    } else {
      throw create.error;
    }
  } else {
    userId = create.data.user!.id;
    console.log(`[bootstrap-admin] auth.users criado (id=${userId})`);
  }

  if (!userId) throw new Error("não foi possível obter userId");

  // 2) Espelha em public.users.
  await prisma.user.upsert({
    where: { id: userId },
    update: {
      email: EMAIL,
      fullName: FULL_NAME,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      id: userId,
      email: EMAIL,
      fullName: FULL_NAME,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log(`[bootstrap-admin] public.users espelhado para SUPER_ADMIN.`);
  console.log("");
  console.log(`Login configurado:`);
  console.log(`  email:    ${EMAIL}`);
  console.log(`  password: (a definida no PRIMARY_PASSWORD)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[bootstrap-admin] falhou:", e);
  process.exit(1);
});
