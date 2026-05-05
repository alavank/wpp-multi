import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().default(3333),
  API_CORS_ORIGIN: z.string().optional(),
  LOG_LEVEL: z.string().default("info"),

  DATABASE_URL: z.string(),
  DIRECT_URL: z.string().optional(),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),

  BAILEYS_AUTH_DIR: z.string().default("./baileys-auth"),
  MEDIA_STORE_DIR: z.string().default("./media-store"),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
