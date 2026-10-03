import { Module } from '@nestjs/common';
import { GetClaimDetailUseCase } from './application/claims/get-claim-detail.use-case';
import { GetClaimStatisticsUseCase } from './application/claims/get-claim-statistics.use-case';
import { ListClaimQueueUseCase } from './application/claims/list-claim-queue.use-case';
import { RecordDecisionUseCase } from './application/decisions/record-decision.use-case';
import { ClaimRepository } from './domain/claims/claim.repository';
import { DecisionRepository } from './domain/decisions/decision.repository';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { PrismaClaimRepository } from './infrastructure/database/prisma/repositories/prisma-claim.repository';
import { PrismaDecisionRepository } from './infrastructure/database/prisma/repositories/prisma-decision.repository';
import { ClaimsController } from './presentation/controllers/claims.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ClaimsController],
  providers: [
    { provide: ClaimRepository, useClass: PrismaClaimRepository },
    { provide: DecisionRepository, useClass: PrismaDecisionRepository },
    {
      provide: RecordDecisionUseCase,
      useFactory: (
        claimRepository: ClaimRepository,
        decisionRepository: DecisionRepository,
      ) => new RecordDecisionUseCase(claimRepository, decisionRepository),
      inject: [ClaimRepository, DecisionRepository],
    },
    {
      provide: GetClaimDetailUseCase,
      useFactory: (claimRepository: ClaimRepository) =>
        new GetClaimDetailUseCase(claimRepository),
      inject: [ClaimRepository],
    },
    {
      provide: GetClaimStatisticsUseCase,
      useFactory: (claimRepository: ClaimRepository) =>
        new GetClaimStatisticsUseCase(claimRepository),
      inject: [ClaimRepository],
    },
    {
      provide: ListClaimQueueUseCase,
      useFactory: (claimRepository: ClaimRepository) =>
        new ListClaimQueueUseCase(claimRepository),
      inject: [ClaimRepository],
    },
  ],
})
export class ClaimsModule {}
