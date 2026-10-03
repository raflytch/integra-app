import { Module } from '@nestjs/common';
import { ListFacilityOptionsUseCase } from './application/facilities/list-facility-options.use-case';
import { ListFacilitySummariesUseCase } from './application/facilities/list-facility-summaries.use-case';
import { FacilityRepository } from './domain/facilities/facility.repository';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { PrismaFacilityRepository } from './infrastructure/database/prisma/repositories/prisma-facility.repository';
import { FacilitiesController } from './presentation/controllers/facilities.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FacilitiesController],
  providers: [
    { provide: FacilityRepository, useClass: PrismaFacilityRepository },
    {
      provide: ListFacilityOptionsUseCase,
      useFactory: (facilityRepository: FacilityRepository) =>
        new ListFacilityOptionsUseCase(facilityRepository),
      inject: [FacilityRepository],
    },
    {
      provide: ListFacilitySummariesUseCase,
      useFactory: (facilityRepository: FacilityRepository) =>
        new ListFacilitySummariesUseCase(facilityRepository),
      inject: [FacilityRepository],
    },
  ],
})
export class FacilitiesModule {}
