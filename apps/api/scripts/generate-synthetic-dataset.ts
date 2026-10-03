/**
 * M-02: writes `prisma/seed-data/synthetic-dataset.json` (about 31 paid LLM
 * calls). Refuses to overwrite an existing file unless run with `--force`.
 *
 *   npm run data:generate --workspace=@app/api [-- --force]
 */
import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  LlmClient,
  type LlmMessage,
} from '../src/application/ports/llm-client.port';
import {
  LlmInvalidOutputError,
  LlmUnavailableError,
} from '../src/application/ports/llm.errors';
import { validateEnv } from '../src/infrastructure/config/env.schema';
import { LlmModule } from '../src/infrastructure/llm/llm.module';
import { SyntheticTariffSchedule } from '../src/infrastructure/tariffs/synthetic-tariff-schedule';
import { buildClaimPlans, type ClaimPlan } from './synthetic/claim-plans';
import { cloneDocuments } from './synthetic/clone-documents';
import {
  DATASET_FILE_PATH,
  DATASET_VERSION,
  type DatasetDocument,
  type SyntheticDataset,
  syntheticDatasetSchema,
} from './synthetic/dataset.schema';
import {
  buildGenerationPrompt,
  type GeneratedDocuments,
  generatedDocumentsSchema,
  findRuleViolations,
  GENERATION_SYSTEM_PROMPT,
} from './synthetic/generation-prompt';
import {
  CLONING_BASE_SCENARIO,
  EVIDENCE_RULES,
  FACILITIES,
  SCENARIOS,
  type ScenarioSpec,
} from './synthetic/scenarios';

const API_ENV_FILE_PATH = join(__dirname, '../.env');
const MAX_ATTEMPTS = 3;
const GENERATION_TEMPERATURE = 0.9;
const shouldOverwrite = process.argv.includes('--force');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: API_ENV_FILE_PATH,
      validate: validateEnv,
    }),
    LlmModule,
  ],
})
class GenerateDatasetModule {}

interface GeneratedClaim {
  documents: GeneratedDocuments;
  model: string;
}

function findScenario(name: ScenarioSpec['name']): ScenarioSpec {
  const scenario = SCENARIOS.find((candidate) => candidate.name === name);
  if (!scenario) throw new Error(`Unknown scenario ${name}`);
  return scenario;
}

/** One LLM call per attempt; content rule violations are fed back before retrying. */
async function generateClaimDocuments(
  llm: LlmClient,
  plan: ClaimPlan,
  generationScenario: ScenarioSpec,
): Promise<GeneratedClaim> {
  const prompt: LlmMessage = {
    role: 'user',
    content: buildGenerationPrompt(plan, generationScenario),
  };
  let messages: LlmMessage[] = [prompt];
  let lastProblem = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await llm.generateStructured({
        system: GENERATION_SYSTEM_PROMPT,
        messages,
        schema: generatedDocumentsSchema,
        temperature: GENERATION_TEMPERATURE,
      });
      const violations = findRuleViolations(
        result.output,
        plan,
        generationScenario,
      );
      if (violations.length === 0) {
        return { documents: result.output, model: result.model };
      }
      lastProblem = violations.join('; ');
      messages = [
        prompt,
        { role: 'assistant', content: JSON.stringify(result.output) },
        {
          role: 'user',
          content: `Jawaban sebelumnya melanggar aturan berikut:\n- ${violations.join('\n- ')}\nTulis ulang seluruh JSON dengan memperbaiki semua pelanggaran tersebut.`,
        },
      ];
    } catch (error) {
      if (
        !(error instanceof LlmUnavailableError) &&
        !(error instanceof LlmInvalidOutputError)
      ) {
        throw error;
      }
      lastProblem = error.message;
      messages = [prompt];
    }
  }

  throw new Error(
    `${plan.claim.claimNo} (${plan.claim.scenario}) failed after ${MAX_ATTEMPTS} attempts: ${lastProblem}`,
  );
}

function toDatasetDocuments(
  documents: GeneratedDocuments,
  plan: ClaimPlan,
): DatasetDocument[] {
  const { slots } = plan;
  const datasetDocuments: DatasetDocument[] = [
    {
      type: 'EXAM_NOTE',
      recordedAt: slots.examNote,
      content: documents.examNote,
    },
    {
      type: 'PRESCRIPTION',
      recordedAt: slots.prescription,
      content: documents.prescription,
    },
    ...(slots.procedure !== null && documents.procedureNote !== null
      ? [
          {
            type: 'PROCEDURE' as const,
            recordedAt: slots.procedure,
            content: documents.procedureNote,
          },
        ]
      : []),
    ...slots.dailyNotes.map((recordedAt, index) => ({
      type: 'DAILY_NOTE' as const,
      recordedAt,
      content: documents.dailyNotes[index],
    })),
    {
      type: 'MEDICAL_RESUME',
      recordedAt: slots.medicalResume,
      content: documents.medicalResume,
    },
  ];
  return datasetDocuments.map((document) => ({
    ...document,
    content: document.content.trim(),
  }));
}

/** UC-3: one generated base set copied to every cloning claim. */
async function generateClonedClaims(
  llm: LlmClient,
  cloningPlans: ClaimPlan[],
): Promise<Map<string, GeneratedClaim>> {
  const baseScenario = findScenario(CLONING_BASE_SCENARIO);
  // The longest stay gives the base enough daily notes for every clone.
  const basePlan = cloningPlans.reduce((longest, plan) =>
    plan.slots.dailyNotes.length > longest.slots.dailyNotes.length
      ? plan
      : longest,
  );
  const base = await generateClaimDocuments(llm, basePlan, baseScenario);
  const basePatient = { age: basePlan.age, gender: basePlan.patient.gender };

  return new Map(
    cloningPlans.map((plan, variant) => {
      const documents = cloneDocuments(
        base.documents,
        basePatient,
        { age: plan.age, gender: plan.patient.gender },
        variant,
        plan.slots.dailyNotes.length,
      );
      const violations = findRuleViolations(documents, plan, baseScenario);
      if (violations.length > 0) {
        throw new Error(
          `${plan.claim.claimNo} clone breaks rules: ${violations.join('; ')}`,
        );
      }
      return [plan.claim.claimNo, { documents, model: base.model }];
    }),
  );
}

async function main(): Promise<void> {
  const logger = new Logger('GenerateDataset');
  if (existsSync(DATASET_FILE_PATH) && !shouldOverwrite) {
    logger.log(
      `${DATASET_FILE_PATH} sudah ada; LLM tidak dipanggil. Jalankan dengan --force untuk membuat ulang.`,
    );
    return;
  }

  const app = await NestFactory.createApplicationContext(
    GenerateDatasetModule,
    {
      logger: ['log', 'error', 'warn'],
    },
  );
  try {
    const llm = app.get(LlmClient);
    const tariffSchedule = new SyntheticTariffSchedule();
    const plans = buildClaimPlans((groupCode, severityLevel) =>
      tariffSchedule.findTariff(groupCode, severityLevel),
    );
    const cloningPlans = plans.filter(
      (plan) => plan.claim.scenario === 'UC3_CLONING',
    );
    const generatedPlans = plans.filter(
      (plan) => plan.claim.scenario !== 'UC3_CLONING',
    );
    logger.log(
      `Generating ${generatedPlans.length + 1} claims with the LLM and ${cloningPlans.length} clones.`,
    );

    // Any failure rejects here and nothing is written.
    const [generatedClaims, clonedClaims] = await Promise.all([
      Promise.all(
        generatedPlans.map(async (plan) => {
          const generatedClaim = await generateClaimDocuments(
            llm,
            plan,
            plan.scenario,
          );
          logger.log(`${plan.claim.claimNo} ${plan.claim.scenario} ok`);
          return [plan.claim.claimNo, generatedClaim] as const;
        }),
      ),
      generateClonedClaims(llm, cloningPlans),
    ]);
    const generatedByClaimNo = new Map([...generatedClaims, ...clonedClaims]);

    const dataset: SyntheticDataset = syntheticDatasetSchema.parse({
      version: DATASET_VERSION,
      generatedAt: new Date().toISOString(),
      model: generatedClaims[0]?.[1].model ?? 'unknown',
      facilities: FACILITIES,
      patients: plans.map((plan) => plan.patient),
      evidenceRules: EVIDENCE_RULES,
      claims: plans.map((plan) => {
        const generatedClaim = generatedByClaimNo.get(plan.claim.claimNo);
        if (!generatedClaim) {
          throw new Error(`${plan.claim.claimNo} has no documents`);
        }
        return {
          ...plan.claim,
          documents: toDatasetDocuments(generatedClaim.documents, plan),
        };
      }),
    });

    await mkdir(dirname(DATASET_FILE_PATH), { recursive: true });
    await writeFile(
      DATASET_FILE_PATH,
      `${JSON.stringify(dataset, null, 2)}\n`,
      'utf-8',
    );
    logger.log(
      `Wrote ${dataset.claims.length} claims to ${DATASET_FILE_PATH}.`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  // Exit now so queued LLM calls for other claims are not paid for.
  process.exit(1);
});
