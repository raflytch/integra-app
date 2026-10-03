/**
 * Read-only calibration report for Uji Bukan Salinan (M-06). Scores every
 * cloning claim and a sample of non-cloning claims against their candidates,
 * without an LLM, and shows whether the active threshold separates them.
 *
 *   npm run eval:similarity
 */
import 'reflect-metadata';
import { join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { scoreSimilarClaims } from '../src/domain/analysis/similarity-test';
import { type Env, validateEnv } from '../src/infrastructure/config/env.schema';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { PrismaAnalysisRepository } from '../src/infrastructure/database/prisma/repositories/prisma-analysis.repository';

const API_ENV_FILE_PATH = join(__dirname, '../.env');
const NON_CLONING_SAMPLE_SIZE = 50;
const TOP_NON_CLONE_PAIRS = 10;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: API_ENV_FILE_PATH,
      validate: validateEnv,
    }),
  ],
})
class SimilarityReportModule {}

interface ScoredPair {
  claimNo: string;
  relatedClaimNo: string;
  similarity: number;
}

/** Evenly spaced picks, so the sample covers the whole claim range. */
function sampleEvenly<Item>(items: Item[], size: number): Item[] {
  if (items.length <= size) return items;
  return Array.from(
    { length: size },
    (_, index) => items[Math.floor((index * items.length) / size)],
  );
}

function formatPair({ claimNo, relatedClaimNo, similarity }: ScoredPair) {
  return `  ${similarity.toFixed(3)}  ${claimNo} ↔ ${relatedClaimNo}`;
}

async function main(): Promise<void> {
  const logger = new Logger('SimilarityReport');
  const app = await NestFactory.createApplicationContext(
    SimilarityReportModule,
    { logger: ['log', 'error', 'warn'] },
  );
  // tsx emits no decorator metadata, so dependencies are wired by hand.
  const config = app.get(ConfigService<Env, true>);
  const prisma = new PrismaService(config);
  const analysisRepository = new PrismaAnalysisRepository(prisma);
  const threshold = config.get('SIMILARITY_THRESHOLD', { infer: true });

  try {
    const claims = await prisma.claim.findMany({
      orderBy: { claimNo: 'asc' },
      select: { id: true, facilityId: true, injectedCase: true },
    });
    const claimById = new Map(claims.map((claim) => [claim.id, claim]));
    const isCloning = (claimId: string) =>
      claimById.get(claimId)?.injectedCase.includes('CLONING') ?? false;
    // Clusters never cross facilities, so a shared facility marks a cluster pair.
    const isSameCluster = (claimId: string, relatedClaimId: string) =>
      isCloning(claimId) &&
      isCloning(relatedClaimId) &&
      claimById.get(claimId)?.facilityId ===
        claimById.get(relatedClaimId)?.facilityId;

    const cloningClaims = claims.filter((claim) => isCloning(claim.id));
    const sampledClaims = sampleEvenly(
      claims.filter((claim) => !isCloning(claim.id)),
      NON_CLONING_SAMPLE_SIZE,
    );

    const nonClonePairs: ScoredPair[] = [];
    const clusterPairs: ScoredPair[] = [];
    for (const { id } of [...cloningClaims, ...sampledClaims]) {
      const claim = await analysisRepository.findClaimEvidence(id);
      if (!claim) continue;
      const candidates =
        await analysisRepository.findSimilarityCandidates(claim);
      for (const match of scoreSimilarClaims(claim, candidates)) {
        const pair = {
          claimNo: claim.claimNo,
          relatedClaimNo: match.relatedClaimNo,
          similarity: match.similarity,
        };
        if (isSameCluster(id, match.relatedClaimId)) {
          clusterPairs.push(pair);
        } else if (!isCloning(id) || !isCloning(match.relatedClaimId)) {
          nonClonePairs.push(pair);
        }
      }
    }

    const topNonClonePairs = nonClonePairs
      .sort((first, second) => second.similarity - first.similarity)
      .slice(0, TOP_NON_CLONE_PAIRS);
    const lowestClusterPair = clusterPairs.reduce<ScoredPair | null>(
      (lowest, pair) =>
        !lowest || pair.similarity < lowest.similarity ? pair : lowest,
      null,
    );
    const highestNonClone = topNonClonePairs[0]?.similarity ?? 0;
    const separation = !lowestClusterPair
      ? 'Tidak ada pasangan sesama kluster kloning; jalankan npm run seed:demo.'
      : lowestClusterPair.similarity >= threshold && highestNonClone < threshold
        ? 'Ambang memisahkan kloning dari non-kloning.'
        : lowestClusterPair.similarity > highestNonClone
          ? 'Ambang aktif TIDAK di antara kedua angka; sesuaikan SIMILARITY_THRESHOLD.'
          : 'TUMPANG TINDIH: skor non-kloning tertinggi >= skor kluster terendah.';

    logger.log(
      [
        `Klaim kloning: ${cloningClaims.length}, sampel non-kloning: ${sampledClaims.length}`,
        `Pasangan dinilai: ${nonClonePairs.length} bukan-keduanya-kloning, ${clusterPairs.length} sesama kluster`,
        `${TOP_NON_CLONE_PAIRS} skor tertinggi pasangan yang bukan keduanya kloning:`,
        ...topNonClonePairs.map(formatPair),
        'Skor terendah pasangan sesama kluster kloning:',
        lowestClusterPair ? formatPair(lowestClusterPair) : '  -',
        `Ambang aktif (SIMILARITY_THRESHOLD): ${threshold}`,
        separation,
      ].join('\n'),
    );
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
