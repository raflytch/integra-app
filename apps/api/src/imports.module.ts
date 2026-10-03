import { Module } from '@nestjs/common';
import { ImportClaimsUseCase } from './application/imports/import-claims.use-case';
import { PreviewClaimImportUseCase } from './application/imports/preview-claim-import.use-case';
import { LlmClient } from './application/ports/llm-client.port';
import { ClaimImportRepository } from './domain/imports/claim-import.repository';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { PrismaClaimImportRepository } from './infrastructure/database/prisma/repositories/prisma-claim-import.repository';
import { LlmModule } from './infrastructure/llm/llm.module';
import { ImportsController } from './presentation/controllers/imports.controller';

@Module({
  imports: [PrismaModule, LlmModule],
  controllers: [ImportsController],
  providers: [
    { provide: ClaimImportRepository, useClass: PrismaClaimImportRepository },
    {
      provide: PreviewClaimImportUseCase,
      useFactory: (
        claimImportRepository: ClaimImportRepository,
        llmClient: LlmClient,
      ) => new PreviewClaimImportUseCase(claimImportRepository, llmClient),
      inject: [ClaimImportRepository, LlmClient],
    },
    {
      provide: ImportClaimsUseCase,
      useFactory: (claimImportRepository: ClaimImportRepository) =>
        new ImportClaimsUseCase(claimImportRepository),
      inject: [ClaimImportRepository],
    },
  ],
})
export class ImportsModule {}
