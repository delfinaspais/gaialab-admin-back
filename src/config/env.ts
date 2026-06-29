import { z } from "zod";

const requiredKeys = [
  "DATABASE_URL",
  "APP_URL",
  "TIENDANUBE_CLIENT_ID",
  "TIENDANUBE_CLIENT_SECRET",
  "TIENDANUBE_REDIRECT_URI",
] as const;

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url(),
  TIENDANUBE_CLIENT_ID: z.string().min(1),
  TIENDANUBE_CLIENT_SECRET: z.string().min(1),
  TIENDANUBE_REDIRECT_URI: z.string().url(),
  TIENDANUBE_API_VERSION: z.string().default("2025-03"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const missing = requiredKeys.filter((key) => !process.env[key]);
    const present = requiredKeys.filter((key) => !!process.env[key]);

    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    console.error("Missing keys:", missing.join(", ") || "(none)");
    console.error("Present keys:", present.join(", ") || "(none)");
    console.error(
      "Railway tip: variables must be on the WEB service (gaialab-admin-back), not only on Postgres. " +
        "Use Add Variable Reference for DATABASE_URL: ${{Postgres.DATABASE_URL}}, then redeploy."
    );
    throw new Error("Invalid environment configuration");
  }

  return parsed.data;
}

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }
  return cachedEnv;
}

/** @deprecated use getEnv() — kept for gradual migration */
export const env = new Proxy({} as Env, {
  get(_target, prop: keyof Env) {
    return getEnv()[prop];
  },
});
