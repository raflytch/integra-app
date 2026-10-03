import { Injectable } from '@nestjs/common';
import type { User, UserCredentials } from '../../../../domain/users/user';
import { UserRepository } from '../../../../domain/users/user.repository';
import { PrismaService } from '../prisma.service';

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
}
