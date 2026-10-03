import 'reflect-metadata';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import QRCode from 'qrcode';
import type { UserRole } from '../src/domain/users/user';
import { type Env, validateEnv } from '../src/infrastructure/config/env.schema';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { AesGcmSecretCipher } from '../src/infrastructure/security/aes-gcm-secret-cipher';
import { OtplibTotpVerifier } from '../src/infrastructure/security/otplib-totp-verifier';

const API_ENV_FILE_PATH = join(__dirname, '../.env');
/** Gitignored: each PNG holds a live TOTP secret. */
const ENROLLMENT_QR_DIRECTORY = join(__dirname, '../.totp-qr');
const DEMO_ACCOUNTS: { email: string; name: string; role: UserRole }[] = [
  {
    email: 'verifikator@integra.local',
    name: 'Verifikator Demo',
    role: 'VERIFIER',
  },
  {
    email: 'supervisor@integra.local',
    name: 'Supervisor Demo',
    role: 'SUPERVISOR',
  },
];
const PENDING_TOTP_SECRET = 'pending';
const shouldRotateSecrets = process.argv.includes('--rotate');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: API_ENV_FILE_PATH,
      validate: validateEnv,
    }),
  ],
})
class SeedUsersModule {}

async function main(): Promise<void> {
  const logger = new Logger('SeedUsers');
  const app = await NestFactory.createApplicationContext(SeedUsersModule, {
    logger: ['log', 'error', 'warn'],
  });
  const config = app.get(ConfigService<Env, true>);
  const prisma = new PrismaService(config);
  const secretCipher = new AesGcmSecretCipher(config);
  const totpVerifier = new OtplibTotpVerifier();

  for (const account of DEMO_ACCOUNTS) {
    const existingUser = await prisma.user.findUnique({
      where: { email: account.email },
    });
    if (existingUser && !shouldRotateSecrets) {
      logger.log(
        `${account.email} sudah terdaftar. Jalankan dengan --rotate untuk secret baru.`,
      );
      continue;
    }

    const totpSecret = totpVerifier.generateSecret();
    await prisma.$transaction(async (transaction) => {
      const user =
        existingUser ??
        (await transaction.user.create({
          data: { ...account, totpSecretEnc: PENDING_TOTP_SECRET },
        }));
      await transaction.user.update({
        where: { id: user.id },
        data: {
          ...account,
          totpSecretEnc: secretCipher.encrypt(totpSecret, user.id),
          totpLastStep: null,
        },
      });
    });

    const enrollmentUri = totpVerifier.buildEnrollmentUri(
      account.email,
      totpSecret,
    );
    const qrImagePath = join(ENROLLMENT_QR_DIRECTORY, `${account.email}.png`);
    await mkdir(ENROLLMENT_QR_DIRECTORY, { recursive: true });
    await QRCode.toFile(qrImagePath, enrollmentUri, { width: 320 });
    const terminalQr = await QRCode.toString(enrollmentUri, {
      type: 'terminal',
      small: true,
    });

    logger.log(
      [
        `${account.name} (${account.role})`,
        `  Email      : ${account.email}`,
        `  Setup key  : ${totpSecret}`,
        `  otpauth URI: ${enrollmentUri}`,
        `  QR (PNG)   : ${qrImagePath}`,
        'Pindai QR berikut dengan aplikasi authenticator:',
        terminalQr,
      ].join('\n'),
    );
  }

  await prisma.$disconnect();
  await app.close();
}

void main();
