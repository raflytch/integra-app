import { Module } from '@nestjs/common';
import { DownloadVedikaAttachmentUseCase } from './application/vedika/download-vedika-attachment.use-case';
import { ListVedikaClaimsUseCase } from './application/vedika/list-vedika-claims.use-case';
import { GetVedikaStatusUseCase } from './application/vedika/get-vedika-status.use-case';
import { RefreshAllVedikaUseCase } from './application/vedika/refresh-all-vedika.use-case';
import { SendVedikaAttachmentUseCase } from './application/vedika/send-vedika-attachment.use-case';
import { ClaimRepository } from './domain/claims/claim.repository';
import { VedikaRepository } from './domain/vedika/vedika.repository';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { PrismaClaimRepository } from './infrastructure/database/prisma/repositories/prisma-claim.repository';
import { PrismaVedikaRepository } from './infrastructure/database/prisma/repositories/prisma-vedika.repository';
import { VedikaClaimsController } from './presentation/controllers/vedika-claims.controller';
import { VedikaController } from './presentation/controllers/vedika.controller';

@Module({
  imports: [PrismaModule],
  controllers: [VedikaController, VedikaClaimsController],
  providers: [
    { provide: ClaimRepository, useClass: PrismaClaimRepository },
    { provide: VedikaRepository, useClass: PrismaVedikaRepository },
    {
      provide: GetVedikaStatusUseCase,
      useFactory: (
        claimRepository: ClaimRepository,
        vedikaRepository: VedikaRepository,
      ) => new GetVedikaStatusUseCase(claimRepository, vedikaRepository),
      inject: [ClaimRepository, VedikaRepository],
    },
    {
      provide: SendVedikaAttachmentUseCase,
      useFactory: (
        claimRepository: ClaimRepository,
        vedikaRepository: VedikaRepository,
      ) => new SendVedikaAttachmentUseCase(claimRepository, vedikaRepository),
      inject: [ClaimRepository, VedikaRepository],
    },
    {
      provide: ListVedikaClaimsUseCase,
      useFactory: (vedikaRepository: VedikaRepository) =>
        new ListVedikaClaimsUseCase(vedikaRepository),
      inject: [VedikaRepository],
    },
    {
      provide: RefreshAllVedikaUseCase,
      useFactory: (vedikaRepository: VedikaRepository) =>
        new RefreshAllVedikaUseCase(vedikaRepository),
      inject: [VedikaRepository],
    },
    {
      provide: DownloadVedikaAttachmentUseCase,
      useFactory: (vedikaRepository: VedikaRepository) =>
        new DownloadVedikaAttachmentUseCase(vedikaRepository),
      inject: [VedikaRepository],
    },
  ],
})
export class VedikaModule {}
