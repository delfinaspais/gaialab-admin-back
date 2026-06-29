import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url(),
  TIENDANUBE_CLIENT_ID: z.string().min(1),
  TIENDANUBE_CLIENT_SECRET: z.string().min(1),
  TIENDANUBE_REDIRECT_URI: z.string().url(),
  TIENDANUBE_API_VERSION: z.string().default("2025-03"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }

  return parsed.data;
}

export const env = loadEnv();
