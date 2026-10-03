import { Injectable } from '@nestjs/common';
import { ClaimImportRepository } from '../../../../domain/imports/claim-import.repository';
import type {
  ClaimImportResult,
  ImportedClaim,
} from '../../../../domain/imports/imported-claim';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../prisma.service';

const UNIQUE_VIOLATION_CODE = 'P2002';

/** Date-only columns are stored as UTC midnight. */
function toDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

@Injectable()
export class PrismaClaimImportRepository extends ClaimImportRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findExistingClaimNos(claimNos: string[]): Promise<string[]> {
    if (claimNos.length === 0) return [];
    const claims = await this.prisma.claim.findMany({
      where: { claimNo: { in: claimNos } },
      select: { claimNo: true },
    });
    return claims.map((claim) => claim.claimNo);
  }

  async importClaims(claims: ImportedClaim[]): Promise<ClaimImportResult> {
    let importedCount = 0;
    const skipped: ClaimImportResult['skipped'] = [];
    for (const claim of claims) {
      try {
        await this.importClaim(claim);
        importedCount += 1;
      } catch (error) {
        // Another import may have taken the claim number since the duplicate check.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === UNIQUE_VIOLATION_CODE
        ) {
          skipped.push({
            claimNo: claim.claimNo,
            reason: 'Nomor klaim sudah ada di INTEGRA',
          });
          continue;
        }
        throw error;
      }
    }
    return { importedCount, skipped };
  }

  private async importClaim({
    facility,
    patient,
    ...claim
  }: ImportedClaim): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      // Existing facilities and patients are reused as they are, never overwritten.
      const { id: facilityId } = await transaction.facility.upsert({
        where: { code: facility.code },
        create: facility,
        update: {},
        select: { id: true },
      });
      const { id: patientId } = await transaction.patient.upsert({
        where: { medicalRecordNo: patient.medicalRecordNo },
        create: { ...patient, birthDate: toDateOnly(patient.birthDate) },
        update: {},
        select: { id: true },
      });
      await transaction.claim.create({
        data: {
          claimNo: claim.claimNo,
          facilityId,
          patientId,
          admittedAt: toDateOnly(claim.admittedAt),
          dischargedAt: toDateOnly(claim.dischargedAt),
          inacbgCode: claim.inacbgCode,
          severityLevel: claim.severityLevel,
          tariffAmount: claim.tariffAmount,
          status: 'PENDING',
          injectedCase: [],
          diagnoses: { create: claim.diagnoses },
          documents: {
            create: claim.documents.map((document) => ({
              ...document,
              recordedAt: new Date(document.recordedAt),
            })),
          },
        },
      });
    });
  }
}
