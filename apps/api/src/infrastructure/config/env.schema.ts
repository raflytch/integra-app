import { z } from 'zod';

/** Environment contract. The app refuses to start when it is not satisfied. */
export const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.url(),
  JWT_SECRET: z.string().min(32),
  TOTP_ENCRYPTION_KEY: z
    .base64()
    .refine(
      (value) => Buffer.from(value, 'base64').length === 32,
      'must decode to exactly 32 bytes (openssl rand -base64 32)',
    ),
  LLM_API_KEY: z.string().min(1),
  LLM_BASE_URL: z.url().default('https://ai.sumopod.com/v1'),
  LLM_MODEL: z.string().min(1).default('deepseek-v4-flash'),
  LLM_MAX_TOKENS: z.coerce.number().int().positive().default(8000),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  LLM_MAX_RETRIES: z.coerce.number().int().min(0).default(2),
  LLM_CONCURRENCY: z.coerce.number().int().positive().default(3),
  /** Claims the AI reads per "Jalankan analisis" request (about 6 LLM calls each). */
  ANALYSIS_BATCH_SIZE: z.coerce.number().int().positive().default(5),
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
