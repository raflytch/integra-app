# TRD — Foundation Backend INTEGRA MVP

|               |                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Lingkup       | `apps/api`: skema Prisma dari ERD, konfigurasi, wiring database, LLM wrapper, primitif keamanan TOTP       |
| Bukan lingkup | Endpoint, controller, guard, use case fitur, seed data, isi prompt ekstraksi                               |
| Rujukan       | `docs/ERD_INTEGRA_MVP.pdf`, `docs/Task_INTEGRA_MVP.xlsx` (M-01, T09 dari M-03, T28 dari M-11), `AGENTS.md` |
| Estimasi      | ± 5 jam, satu orang                                                                                        |

Hasil akhir foundation: `npm run build` lulus, migrasi berhasil di database kosong, dan modul lain tinggal menyuntikkan `PrismaService`, `LlmClient`, `SecretCipher`, dan `TotpVerifier` tanpa menyentuh infrastruktur lagi.

---

## 1. Dependency

```bash
npm install --workspace=@app/api @anthropic-ai/sdk zod otplib cookie-parser
npm install --workspace=@app/api -D @types/cookie-parser tsx
```

| Paket               | Dipakai untuk                                              |
| ------------------- | ---------------------------------------------------------- |
| `@anthropic-ai/sdk` | Adapter LLM (Claude) di infrastructure                     |
| `zod`               | Skema output terstruktur LLM dan validasi env              |
| `otplib` (v13)      | Generate dan verifikasi TOTP, termasuk anti-replay bawaan  |
| `cookie-parser`     | Membaca cookie sesi (dipakai M-11)                         |
| `tsx`               | Menjalankan script TypeScript (smoke test LLM, nanti seed) |

`@nestjs/jwt` dan `@nestjs/throttler` baru dipasang di M-11 bersama endpoint auth.

---

## 2. Struktur folder

```
apps/api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/
│   └── llm-smoke.ts
└── src/
    ├── domain/
    │   └── shared/domain-error.ts
    ├── application/
    │   └── ports/
    │       ├── llm-client.port.ts
    │       ├── llm.errors.ts
    │       ├── secret-cipher.port.ts
    │       └── totp-verifier.port.ts
    ├── infrastructure/
    │   ├── config/env.schema.ts
    │   ├── database/prisma/            (sudah ada)
    │   ├── llm/
    │   │   ├── anthropic-llm.client.ts
    │   │   ├── semaphore.ts
    │   │   └── llm.module.ts
    │   └── security/
    │       ├── aes-gcm-secret-cipher.ts
    │       ├── otplib-totp-verifier.ts
    │       └── security.module.ts
    ├── presentation/
    │   └── filters/domain-exception.filter.ts
    ├── app.module.ts
    └── main.ts
```

Aturan dependency mengikuti `AGENTS.md`: port dan error didefinisikan di `application`, implementasinya di `infrastructure`, dan wiring di module Nest. Use case tidak pernah meng-import `@anthropic-ai/sdk`, `otplib`, atau Prisma.

---

## 3. Environment dan konfigurasi

### 3.1 Variabel

| Variabel              | Contoh                                              | Keterangan                                         |
| --------------------- | --------------------------------------------------- | -------------------------------------------------- |
| `DATABASE_URL`        | `postgresql://postgres:password@localhost:5433/app` | Sudah ada                                          |
| `PORT`                | `3001`                                              | Sudah ada                                          |
| `WEB_ORIGIN`          | `http://localhost:3000`                             | Origin Next.js untuk CORS                          |
| `JWT_SECRET`          | 32+ karakter acak                                   | Dipakai M-11, divalidasi sejak awal                |
| `TOTP_ENCRYPTION_KEY` | `openssl rand -base64 32`                           | Kunci AES-256, harus 32 byte setelah decode base64 |
| `ANTHROPIC_API_KEY`   | `sk-ant-...`                                        | Kunci LLM API                                      |
| `LLM_MODEL`           | `claude-opus-5-5`                                   | Bisa diganti tanpa ubah kode                       |
| `LLM_EFFORT`          | `medium`                                            | `low` / `medium` / `high` / `xhigh` / `max`        |
| `LLM_MAX_TOKENS`      | `16000`                                             | Batas output per panggilan                         |
| `LLM_TIMEOUT_MS`      | `120000`                                            | Timeout per request                                |
| `LLM_MAX_RETRIES`     | `2`                                                 | Retry otomatis SDK untuk 408/409/429/5xx           |
| `LLM_CONCURRENCY`     | `3`                                                 | Maksimal panggilan LLM paralel                     |

Semua variabel ditambahkan ke `apps/api/.env.example` dengan nilai contoh, tanpa kunci asli.

### 3.2 Validasi saat start

Aplikasi harus gagal start kalau env tidak lengkap, bukan gagal di tengah demo.

```ts
// src/infrastructure/config/env.schema.ts
import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().default(3001),
  WEB_ORIGIN: z.string().url(),
  JWT_SECRET: z.string().min(32),
  TOTP_ENCRYPTION_KEY: z
    .string()
    .refine(
      (value) => Buffer.from(value, 'base64').length === 32,
      'must decode to 32 bytes',
    ),
  ANTHROPIC_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().default('claude-opus-5-5'),
  LLM_EFFORT: z
    .enum(['low', 'medium', 'high', 'xhigh', 'max'])
    .default('medium'),
  LLM_MAX_TOKENS: z.coerce.number().int().positive().default(16000),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  LLM_MAX_RETRIES: z.coerce.number().int().min(0).default(2),
  LLM_CONCURRENCY: z.coerce.number().int().positive().default(3),
});

export type Env = z.infer<typeof envSchema>;
```

```ts
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  validate: (config) => envSchema.parse(config),
});
```

Komponen membaca env lewat `ConfigService<Env, true>` (`config.get('LLM_MODEL', { infer: true })`), tidak lewat `process.env` langsung.

---

## 4. Konversi ERD ke Prisma

### 4.1 Aturan konversi

| ERD                           | Prisma                                             |
| ----------------------------- | -------------------------------------------------- |
| Nama tabel `snake_case` jamak | Model `PascalCase` tunggal + `@@map("nama_tabel")` |
| Kolom `snake_case`            | Field `camelCase` + `@map("nama_kolom")`           |
| `uuid`                        | `String @id @default(uuid()) @db.Uuid`             |
| `decimal` (rupiah)            | `Decimal @db.Decimal(14, 2)`                       |
| `date`                        | `DateTime @db.Date`                                |
| `jsonb`                       | `Json` (PostgreSQL otomatis `JSONB`)               |
| `enum[]`                      | `InjectedCase[] @default([])`                      |
| Enum                          | `enum` Prisma + `@@map("snake_case")`              |
| Dua FK ke tabel yang sama     | Relasi bernama `@relation("...")` di kedua sisi    |

Penyesuaian kecil terhadap ERD:

- `clinical_documents.extracted` dibuat **nullable**, karena baru terisi setelah ekstraksi berjalan.
- `findings.citations` default `[]`.
- `claims.potential_gap` dan `priority_score` default `0`, karena dihitung setelah analisis.
- Ditambah index untuk query antrean (`status`, `priority_score DESC`) dan index FK yang sering di-join.

### 4.2 `prisma/schema.prisma`

Blok `generator` dan `datasource` tetap seperti yang sudah ada. Skema di bawah sudah lolos `prisma validate` dengan Prisma 7.10.

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}

enum UserRole {
  VERIFIER
  SUPERVISOR

  @@map("user_role")
}

enum FacilityType {
  A
  B
  C
  D

  @@map("facility_type")
}

enum Gender {
  M
  F

  @@map("gender")
}

enum ClaimStatus {
  PENDING
  APPROVED
  CLARIFICATION_REQUESTED
  ESCALATED

  @@map("claim_status")
}

enum InjectedCase {
  UPCODING
  EXAM_MANIPULATION
  CLONING

  @@map("injected_case")
}

enum DocumentType {
  MEDICAL_RESUME
  EXAM_NOTE
  DAILY_NOTE
  PRESCRIPTION
  PROCEDURE

  @@map("document_type")
}

enum EvidenceType {
  MEDICATION
  PROCEDURE
  FINDING
  VITAL_SIGN

  @@map("evidence_type")
}

enum TestType {
  EXISTENCE
  CONSISTENCY
  SIMILARITY

  @@map("test_type")
}

enum DecisionAction {
  APPROVE
  REQUEST_CLARIFICATION
  ESCALATE

  @@map("decision_action")
}

model User {
  id           String   @id @default(uuid()) @db.Uuid
  name         String
  email        String   @unique
  role         UserRole
  totpSecret   String   @map("totp_secret")
  totpLastStep BigInt?  @map("totp_last_step")
  createdAt    DateTime @default(now()) @map("created_at")

  decisions Decision[]

  @@map("users")
}

model Facility {
  id   String       @id @default(uuid()) @db.Uuid
  code String       @unique
  name String
  type FacilityType
  city String

  claims Claim[]

  @@map("facilities")
}

model Patient {
  id              String   @id @default(uuid()) @db.Uuid
  medicalRecordNo String   @unique @map("medical_record_no")
  name            String
  gender          Gender
  birthDate       DateTime @map("birth_date") @db.Date

  claims Claim[]

  @@map("patients")
}

model Claim {
  id            String         @id @default(uuid()) @db.Uuid
  claimNo       String         @unique @map("claim_no")
  facilityId    String         @map("facility_id") @db.Uuid
  patientId     String         @map("patient_id") @db.Uuid
  admittedAt    DateTime       @map("admitted_at") @db.Date
  dischargedAt  DateTime       @map("discharged_at") @db.Date
  inacbgCode    String         @map("inacbg_code")
  severityLevel Int            @map("severity_level") @db.SmallInt
  tariffAmount  Decimal        @map("tariff_amount") @db.Decimal(14, 2)
  potentialGap  Decimal        @default(0) @map("potential_gap") @db.Decimal(14, 2)
  priorityScore Float          @default(0) @map("priority_score")
  status        ClaimStatus    @default(PENDING)
  injectedCase  InjectedCase[] @default([]) @map("injected_case")
  createdAt     DateTime       @default(now()) @map("created_at")

  facility        Facility           @relation(fields: [facilityId], references: [id])
  patient         Patient            @relation(fields: [patientId], references: [id])
  diagnoses       ClaimDiagnosis[]
  documents       ClinicalDocument[]
  findings        Finding[]          @relation("FindingClaim")
  relatedFindings Finding[]          @relation("FindingRelatedClaim")
  decisions       Decision[]

  @@index([status, priorityScore(sort: Desc)])
  @@index([facilityId])
  @@index([patientId])
  @@map("claims")
}

model ClaimDiagnosis {
  id        String  @id @default(uuid()) @db.Uuid
  claimId   String  @map("claim_id") @db.Uuid
  icd10Code String  @map("icd10_code")
  name      String
  isPrimary Boolean @default(false) @map("is_primary")

  claim    Claim     @relation(fields: [claimId], references: [id], onDelete: Cascade)
  findings Finding[]

  @@index([claimId])
  @@map("claim_diagnoses")
}

model ClinicalDocument {
  id         String       @id @default(uuid()) @db.Uuid
  claimId    String       @map("claim_id") @db.Uuid
  type       DocumentType
  recordedAt DateTime     @map("recorded_at")
  content    String
  extracted  Json?

  claim           Claim     @relation(fields: [claimId], references: [id], onDelete: Cascade)
  findings        Finding[] @relation("FindingDocument")
  relatedFindings Finding[] @relation("FindingRelatedDocument")

  @@index([claimId])
  @@map("clinical_documents")
}

model EvidenceRule {
  id           String       @id @default(uuid()) @db.Uuid
  icd10Code    String       @map("icd10_code")
  evidenceType EvidenceType @map("evidence_type")
  expected     String
  guidelineRef String       @map("guideline_ref")

  @@index([icd10Code])
  @@map("evidence_rules")
}

model Finding {
  id                String   @id @default(uuid()) @db.Uuid
  claimId           String   @map("claim_id") @db.Uuid
  testType          TestType @map("test_type")
  strength          Float
  summary           String
  citations         Json     @default("[]")
  documentId        String?  @map("document_id") @db.Uuid
  relatedDocumentId String?  @map("related_document_id") @db.Uuid
  diagnosisId       String?  @map("diagnosis_id") @db.Uuid
  relatedClaimId    String?  @map("related_claim_id") @db.Uuid
  similarity        Float?
  tariffGap         Decimal? @map("tariff_gap") @db.Decimal(14, 2)
  createdAt         DateTime @default(now()) @map("created_at")

  claim           Claim             @relation("FindingClaim", fields: [claimId], references: [id], onDelete: Cascade)
  relatedClaim    Claim?            @relation("FindingRelatedClaim", fields: [relatedClaimId], references: [id], onDelete: Cascade)
  document        ClinicalDocument? @relation("FindingDocument", fields: [documentId], references: [id], onDelete: SetNull)
  relatedDocument ClinicalDocument? @relation("FindingRelatedDocument", fields: [relatedDocumentId], references: [id], onDelete: SetNull)
  diagnosis       ClaimDiagnosis?   @relation(fields: [diagnosisId], references: [id], onDelete: SetNull)

  @@unique([claimId, relatedClaimId, testType])
  @@index([claimId, testType])
  @@map("findings")
}

model Decision {
  id         String         @id @default(uuid()) @db.Uuid
  claimId    String         @map("claim_id") @db.Uuid
  verifierId String         @map("verifier_id") @db.Uuid
  action     DecisionAction
  reason     String
  createdAt  DateTime       @default(now()) @map("created_at")

  claim    Claim @relation(fields: [claimId], references: [id], onDelete: Cascade)
  verifier User  @relation(fields: [verifierId], references: [id])

  @@index([claimId, createdAt])
  @@map("decisions")
}
```

### 4.3 Catatan untuk modul pemakai

- **Unique `(claimId, relatedClaimId, testType)`.** Uji Bukan Salinan (M-06) memakai `upsert` dengan kunci `claimId_relatedClaimId_testType`. Uji Ada dan Uji Konsisten tidak memakai `upsert` karena `relatedClaimId` mereka `null`. Sebelum menulis ulang hasil, mereka menghapus finding lama per `(claimId, testType)`.
- **`Decimal`** dikembalikan Prisma sebagai `Prisma.Decimal`. Konversi ke `number` dilakukan di repository (infrastructure), bukan di domain.
- **`totpLastStep`** bertipe `BigInt`. Konversi `Number(...)` dilakukan di repository user.
- **Repository** (contract di `domain`, implementasi Prisma di `infrastructure`) dibuat oleh modul yang pertama kali membutuhkannya, mengikuti aturan `AGENTS.md`. Foundation hanya menyiapkan `PrismaService`.

### 4.4 Wiring database

- Import `PrismaModule` di `AppModule`. Module dan service-nya sudah ada di `src/infrastructure/database/prisma/` dan saat ini sengaja belum di-wiring.
- Jalankan `npm run prisma:migrate -- --name init`, lalu commit folder `prisma/migrations/`.
- Client hasil generate (`apps/api/src/generated/`) sudah masuk `.gitignore`, jadi jalankan `npm run prisma:generate` setelah clone.

---

## 5. LLM wrapper

### 5.1 Prinsip

- **Port netral provider.** Use case hanya mengenal `LlmClient`. Kalau tim pindah provider, cukup tambah adapter baru dan ganti binding di `LlmModule`.
- **Dua kemampuan saja:**
  - `generateText` untuk menulis dokumen sintetis (M-02);
  - `generateStructured` untuk ekstraksi bukti dengan output tervalidasi skema (M-03).
- **Error diterjemahkan.** Error SDK tidak boleh keluar dari infrastructure. Pemakai hanya menerima error dari `llm.errors.ts`.
- **Hemat panggilan.** Hasil generate dan ekstraksi disimpan, sehingga demo tidak memanggil API ulang. Ini tanggung jawab M-02 dan M-03, wrapper tidak melakukan caching.

### 5.2 Port (`application/ports/llm-client.port.ts`)

```ts
import type { ZodType } from 'zod';

export type LlmEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  system?: string;
  messages: LlmMessage[];
  effort?: LlmEffort;
  maxTokens?: number;
}

export interface StructuredLlmRequest<T> extends LlmRequest {
  schema: ZodType<T>;
}

export interface LlmResult<T> {
  output: T;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export abstract class LlmClient {
  abstract generateText(request: LlmRequest): Promise<LlmResult<string>>;
  abstract generateStructured<T>(
    request: StructuredLlmRequest<T>,
  ): Promise<LlmResult<T>>;
}
```

Port memakai `abstract class` supaya langsung bisa jadi token DI Nest tanpa `@Inject` string. Zod diizinkan di layer application karena ia library skema murni, bukan framework.

### 5.3 Error (`application/ports/llm.errors.ts`)

| Error                   | Kapan                                                         | Sikap pemakai                                            |
| ----------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| `LlmUnavailableError`   | 429, 5xx, timeout, atau koneksi gagal setelah retry SDK habis | Tandai klaim gagal diproses, lanjut ke klaim berikutnya  |
| `LlmRefusedError`       | `stop_reason === 'refusal'`, termasuk setelah fallback        | Catat `category`, lewati klaim                           |
| `LlmInvalidOutputError` | `stop_reason === 'max_tokens'` atau `parsed_output` null      | Boleh dicoba ulang sekali dengan `maxTokens` lebih besar |
| `LlmConfigurationError` | 400 atau 401 (model salah, key salah)                         | Hentikan proses, karena tidak akan sembuh dengan retry   |

Semua error turunan dari `LlmError extends Error`.

### 5.4 Adapter (`infrastructure/llm/anthropic-llm.client.ts`)

Inti panggilan SDK di bawah sudah di-typecheck terhadap `@anthropic-ai/sdk` 0.131 dengan setting `tsconfig` repo (CommonJS, `moduleResolution: node`).

```ts
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

// generateStructured
const response = await this.client.beta.messages.parse({
  model: this.model,
  max_tokens: request.maxTokens ?? this.maxTokens,
  betas: [FALLBACK_BETA],
  fallbacks: 'default',
  system: request.system,
  messages: request.messages,
  output_config: {
    effort: request.effort ?? this.effort,
    format: betaZodOutputFormat(request.schema),
  },
});
if (response.stop_reason === 'refusal') {
  throw new LlmRefusedError(response.stop_details?.category ?? null);
}
if (response.stop_reason === 'max_tokens' || response.parsed_output === null) {
  throw new LlmInvalidOutputError();
}
// return { output: response.parsed_output, model: response.model, usage: ... }

// generateText: client.beta.messages.create dengan parameter yang sama tanpa format,
// lalu gabungkan semua blok bertipe 'text'.
```

Ketentuan adapter:

- **Client dibuat sekali** di constructor: `new Anthropic({ apiKey, maxRetries, timeout })` dari `ConfigService`. Retry untuk 408, 409, 429, 5xx, dan error koneksi sudah ditangani SDK, jadi tidak perlu retry manual.
- **Thinking.** Parameter `thinking` tidak dikirim. Di `claude-opus-5-5` thinking selalu aktif dan diatur lewat `effort`, sedangkan `{ type: 'disabled' }` justru ditolak dengan error 400.
- **`fallbacks: 'default'`.** Kalau safety classifier menolak request, API otomatis menjalankannya ulang di model fallback dalam panggilan yang sama. Ini relevan karena teks klinis kadang tertangkap classifier.
- **Pemetaan error** memakai class SDK dari yang paling spesifik, bukan pencocokan string pesan:
  - `RateLimitError`, `InternalServerError`, `APIConnectionError` → `LlmUnavailableError`;
  - `AuthenticationError`, `BadRequestError` → `LlmConfigurationError`.
- **Batas paralel.** Setiap panggilan dibungkus `Semaphore` (`LLM_CONCURRENCY`) supaya ekstraksi massal tidak memicu 429.
- **Log** `model`, `usage.input_tokens`, dan `usage.output_tokens` per panggilan lewat `Logger` Nest, tanpa mencatat isi prompt atau dokumen.

### 5.5 Semaphore (`infrastructure/llm/semaphore.ts`)

```ts
export class Semaphore {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active < this.limit) this.active++;
    else await new Promise<void>((resolve) => this.waiting.push(resolve));
    try {
      return await task();
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    }
  }
}
```

Slot langsung diserahkan ke antrean berikutnya tanpa dikurangi dulu, sehingga tidak ada celah race. Sudah diuji: 8 task dengan limit 2 tidak pernah berjalan lebih dari 2 sekaligus.

### 5.6 Module

```ts
@Module({
  providers: [{ provide: LlmClient, useClass: AnthropicLlmClient }],
  exports: [LlmClient],
})
export class LlmModule {}
```

### 5.7 Contoh pemakaian dari modul lain (M-03)

```ts
const ExtractionSchema = z.object({
  diagnoses: z.array(z.object({ name: z.string(), quote: z.string() })),
  // ... sesuai kontrak T02
});

const { output } = await this.llm.generateStructured({
  system: EXTRACTION_SYSTEM_PROMPT,
  messages: [{ role: 'user', content: documentText }],
  schema: ExtractionSchema,
});
```

### 5.8 Smoke test (`scripts/llm-smoke.ts`)

Script ini membuat Nest application context, mengambil `LlmClient`, lalu memanggil `generateStructured` sekali dengan skema kecil (misalnya `{ ok: boolean }`) dan mencetak hasil serta jumlah token. Jalankan dengan `npx tsx scripts/llm-smoke.ts`. Biayanya satu panggilan kecil.

---

## 6. Primitif keamanan (dipakai M-11)

Foundation hanya menyiapkan adapter. Endpoint login, JWT, dan guard tetap dikerjakan di M-11.

### 6.1 `SecretCipher` → `AesGcmSecretCipher`

Mengenkripsi `users.totp_secret` dengan AES-256-GCM. Format simpan `iv.tag.ciphertext` (masing-masing base64), dengan IV 12 byte acak per enkripsi. Sudah diuji encrypt lalu decrypt kembali ke nilai semula.

```ts
encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', this.key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64')).join('.');
}

decrypt(payload: string): string {
  const [iv, tag, ciphertext] = payload.split('.').map((part) => Buffer.from(part, 'base64'));
  if (!iv || !tag || !ciphertext) throw new Error('Malformed secret payload');
  const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
```

### 6.2 `TotpVerifier` → `OtplibTotpVerifier`

Port:

```ts
export abstract class TotpVerifier {
  abstract generateSecret(): string;
  abstract buildEnrollmentUri(accountEmail: string, secret: string): string;
  /** Mengembalikan time-step yang cocok, atau null jika kode salah atau sudah dipakai. */
  abstract verify(
    secret: string,
    code: string,
    lastUsedStep: number | null,
  ): Promise<number | null>;
}
```

Implementasi dengan `otplib` v13:

- `generateSecret()` dan `generateURI({ issuer: 'INTEGRA', label: email, secret })`.
- `verify({ secret, token, epochTolerance: 30, afterTimeStep })`. Toleransi 30 detik setara ±1 langkah untuk mengatasi jam HP yang sedikit meleset.
- **Anti-replay** memakai `afterTimeStep`: `otplib` menolak kode dengan `timeStep <= afterTimeStep`. Sudah diuji: kode yang sama ditolak saat dipakai kedua kalinya.
- **Narrowing hasil:** `verify` mengembalikan union TOTP/HOTP. Pakai `result.valid && 'timeStep' in result`, lalu kembalikan `result.timeStep`. M-11 menyimpannya ke `users.totp_last_step`.

---

## 7. Bootstrap HTTP (`main.ts`)

Tetap tanpa endpoint baru. Hanya menyiapkan perilaku lintas modul:

- `ValidationPipe` global (sudah ada).
- `app.enableCors({ origin: WEB_ORIGIN, credentials: true })`.
- `app.use(cookieParser())`.
- `app.useGlobalFilters(new DomainExceptionFilter())`. Filter ini memetakan `DomainError` (punya `code`) ke status HTTP, error lain ke 500 tanpa membocorkan detail Prisma atau SDK.
- `app.enableShutdownHooks()` agar koneksi Prisma ditutup rapi.

`DomainError` di `src/domain/shared/domain-error.ts` cukup berupa class dasar dengan properti `code`. Error spesifik dibuat oleh modul fitur.

---

## 8. Urutan pengerjaan

| #   | Langkah                                                                                           | Estimasi |
| --- | ------------------------------------------------------------------------------------------------- | -------- |
| 1   | Pasang dependency, tambah env ke `.env.example`, buat `env.schema.ts`, validasi di `ConfigModule` | 0,5 j    |
| 2   | Tulis `schema.prisma`, `prisma:migrate --name init`, wiring `PrismaModule`                        | 1 j      |
| 3   | Port + error LLM, `AnthropicLlmClient`, `Semaphore`, `LlmModule`, smoke script                    | 2 j      |
| 4   | Port + adapter `SecretCipher` dan `TotpVerifier`, `SecurityModule`                                | 0,5 j    |
| 5   | `DomainError`, `DomainExceptionFilter`, CORS, cookie-parser, shutdown hooks                       | 0,5 j    |
| 6   | Perbarui README di `src/*` jika struktur berubah, lalu verifikasi (bagian 9)                      | 0,5 j    |

Langkah 2 diprioritaskan karena Orang B butuh tabel untuk seed data di Hari 1.

---

## 9. Definition of Done

- [ ] `npm run prisma:validate` lulus.
- [ ] `npm run prisma:migrate` berhasil di database kosong dan folder migrasi ter-commit.
- [ ] `npm run build`, `npm run lint`, `npm run typecheck`, dan `npm run format:check` lulus dari root.
- [ ] Aplikasi gagal start dengan pesan jelas jika salah satu env wajib dihapus.
- [ ] `npx tsx scripts/llm-smoke.ts` mengembalikan JSON valid sesuai skema.
- [ ] Mengirim kode TOTP yang sama dua kali: pertama diterima, kedua ditolak (cukup diuji lewat script kecil).
- [ ] Tidak ada import `@anthropic-ai/sdk`, `otplib`, atau `generated/prisma` di `src/domain` maupun `src/application`.
- [ ] `GET /health` tetap jalan.

---

## 10. Keputusan

| Keputusan                                                   | Alasan                                                                                                                       | Alternatif                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Claude lewat `@anthropic-ai/sdk`, default `claude-opus-5-5` | SDK resmi dengan structured output tervalidasi Zod; model bisa diganti lewat `LLM_MODEL`                                     | Provider lain cukup lewat adapter baru di balik `LlmClient`     |
| `effort: medium`                                            | Default model ini; cukup untuk ekstraksi                                                                                     | Naikkan ke `high` lewat env kalau hasil ekstraksi kurang akurat |
| Server-side fallback aktif                                  | Menghindari klaim gagal diproses karena safety classifier membaca teks klinis                                                | Bisa dimatikan dengan menghapus `fallbacks` dan header beta     |
| SDK, bukan Axios, untuk LLM                                 | Retry, timeout, error bertipe, dan parsing skema sudah disediakan SDK. Tetap terisolasi di infrastructure sesuai `AGENTS.md` | `HttpModule` Axios tetap dipakai untuk HTTP eksternal lain      |
| Zod untuk env dan skema LLM                                 | Satu library untuk dua kebutuhan; class-validator tetap khusus DTO HTTP                                                      | class-validator untuk env                                       |
| Repository tidak masuk foundation                           | `AGENTS.md`: abstraksi dibuat saat fitur nyata membutuhkannya                                                                | —                                                               |
