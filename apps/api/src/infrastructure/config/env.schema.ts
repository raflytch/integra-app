import { z } from 'zod';

/** Environment contract. The app refuses to start when it is not satisfied. */
export const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.url(),
  /** Number of reverse-proxy hops to trust for the client IP (Express `trust proxy`); 0 when exposed directly. */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  JWT_SECRET: z.string().min(32),
  TOTP_ENCRYPTION_KEY: z
    .base64()
    .refine(
      (value) => Buffer.from(value, 'base64').length === 32,
      'must decode to exactly 32 bytes (openssl rand -base64 32)',
    ),
  /** Lets the seeded demo accounts sign in without an authenticator code. Keep off in production. */
  DEMO_LOGIN_ENABLED: z.stringbool().default(false),
  LLM_API_KEY: z.string().min(1),
  LLM_BASE_URL: z.url().default('https://ai.sumopod.com/v1'),
  LLM_MODEL: z.string().min(1).default('deepseek-v4-flash'),
  LLM_MAX_TOKENS: z.coerce.number().int().positive().default(8000),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  LLM_MAX_RETRIES: z.coerce.number().int().min(0).default(2),
  LLM_CONCURRENCY: z.coerce.number().int().positive().default(3),
  /** Uji Bukan Salinan: minimum TF-IDF cosine similarity to flag a claim pair; calibrated with `npm run eval:similarity`. */
  SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.65),
});

export type Env = z.infer<typeof envSchema>;

/** `ConfigModule` validate hook: returns typed config or throws a readable error. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
