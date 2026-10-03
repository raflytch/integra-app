import { Injectable } from '@nestjs/common';
import type {
  NewUser,
  User,
  UserCredentials,
} from '../../../../domain/users/user';
import { UserRepository } from '../../../../domain/users/user.repository';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

const UNIQUE_VIOLATION_CODE = 'P2002';
/** Placeholder until the secret, bound to the generated id, is written. */
const PENDING_TOTP_SECRET = 'pending';

const PUBLIC_USER_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findCredentialsByEmail(
    normalizedEmail: string,
  ): Promise<UserCredentials | null> {
    return this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        ...PUBLIC_USER_FIELDS,
        totpSecretEnc: true,
        totpLastStep: true,
      },
    });
  }

  findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_USER_FIELDS,
    });
  }

  async recordTotpStep(userId: string, timeStep: number): Promise<boolean> {
    const { count } = await this.prisma.user.updateMany({
      where: {
        id: userId,
        OR: [{ totpLastStep: null }, { totpLastStep: { lt: timeStep } }],
      },
      data: { totpLastStep: timeStep },
    });
    return count === 1;
  }

  async existsByEmail(normalizedEmail: string): Promise<boolean> {
    const matchingUserCount = await this.prisma.user.count({
      where: { email: normalizedEmail },
    });
    return matchingUserCount > 0;
  }

  async createWithTotp(
    newUser: NewUser,
    encryptTotpSecret: (userId: string) => string,
    totpLastStep: number,
  ): Promise<User | null> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const { id } = await transaction.user.create({
          data: { ...newUser, totpSecretEnc: PENDING_TOTP_SECRET },
          select: { id: true },
        });
        return transaction.user.update({
          where: { id },
          data: { totpSecretEnc: encryptTotpSecret(id), totpLastStep },
          select: PUBLIC_USER_FIELDS,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION_CODE
      ) {
        return null;
      }
      throw error;
    }
  }
}
