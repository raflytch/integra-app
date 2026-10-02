import { Injectable } from '@nestjs/common';
import type { FacilitySummary } from '../../../../domain/facilities/facility-summary';
import { FacilityRepository } from '../../../../domain/facilities/facility.repository';
import { PrismaService } from '../prisma.service';
import { countFindingsByTestType } from './finding-counts';

@Injectable()
export class PrismaFacilityRepository extends FacilityRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findSummaries(): Promise<FacilitySummary[]> {
    const facilities = await this.prisma.facility.findMany({
      include: {
        claims: {
          select: {
            potentialGap: true,
            findings: { select: { testType: true } },
          },
        },
      },
    });

    const facilitySummaries = facilities.map(({ claims, ...facility }) => ({
      facility,
      claimCount: claims.length,
      flaggedClaimCount: claims.filter((claim) => claim.findings.length > 0)
        .length,
      findingCounts: countFindingsByTestType(
        claims.flatMap((claim) => claim.findings),
      ),
      totalPotentialGap: claims.reduce(
        (gapTotal, claim) => gapTotal + claim.potentialGap.toNumber(),
        0,
      ),
    }));

    return facilitySummaries.sort(
      (first, second) => second.totalPotentialGap - first.totalPotentialGap,
    );
  }
}
