/**
 * Seeds the inpatient INA-CBG tariffs of Permenkes 3/2023 Lampiran III from
 * data/inacbg-tariffs-permenkes-3-2023.csv. Idempotent: skips when the table
 * already holds every row, so the production `migrate` service runs it on
 * every deploy.
 *
 *   npm run seed:tariffs
 */
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type Env, validateEnv } from '../src/infrastructure/config/env.schema';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

const API_ENV_FILE_PATH = join(__dirname, '../.env');
const TARIFF_FILE_PATH = join(
  __dirname,
  '../data/inacbg-tariffs-permenkes-3-2023.csv',
);
const CARE_CLASS_COLUMNS = [
  { careClass: 3, column: 3 },
  { careClass: 2, column: 4 },
  { careClass: 1, column: 5 },
] as const;
const INSERT_BATCH_SIZE = 5000;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: API_ENV_FILE_PATH,
      validate: validateEnv,
    }),
  ],
})
class SeedInacbgTariffsModule {}

function readTariffRows() {
  const [, ...lines] = readFileSync(TARIFF_FILE_PATH, 'utf8')
    .trim()
    .split(/\r?\n/);
  return lines.flatMap((line) => {
    const cells = line.split(',');
    return CARE_CLASS_COLUMNS.map(({ careClass, column }) => ({
      regional: Number(cells[0]),
      hospital: cells[1],
      inacbgCode: cells[2],
      careClass,
      amount: Number(cells[column]),
    }));
  });
}

async function main(): Promise<void> {
  const logger = new Logger('SeedInacbgTariffs');
  const app = await NestFactory.createApplicationContext(
    SeedInacbgTariffsModule,
    { logger: ['log', 'error', 'warn'] },
  );
  // tsx emits no decorator metadata, so dependencies are wired by hand.
  const prisma = new PrismaService(app.get(ConfigService<Env, true>));

  try {
    const tariffRows = readTariffRows();
    if ((await prisma.inacbgTariff.count()) === tariffRows.length) {
      logger.log(`Tarif INA-CBG sudah lengkap: ${tariffRows.length} sel.`);
      return;
    }
    await prisma.inacbgTariff.deleteMany();
    for (let start = 0; start < tariffRows.length; start += INSERT_BATCH_SIZE) {
      await prisma.inacbgTariff.createMany({
        data: tariffRows.slice(start, start + INSERT_BATCH_SIZE),
      });
    }
    logger.log(
      `Tarif INA-CBG Permenkes 3/2023: ${tariffRows.length} sel dimuat.`,
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
