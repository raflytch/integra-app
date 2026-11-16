import { Injectable } from '@nestjs/common';
import {
  type TariffBySeverity,
  TariffSchedule,
} from '../../application/ports/tariff-schedule.port';
import { toInacbgGroupCode } from '../../domain/analysis/tariff-gap';
import { PrismaService } from '../database/prisma/prisma.service';
import { SyntheticTariffSchedule } from './synthetic-tariff-schedule';

const SEVERITY_BY_SUFFIX: Readonly<Record<string, number>> = {
  I: 1,
  II: 2,
  III: 3,
};

function severityOf(inacbgCode: string): number | null {
  return SEVERITY_BY_SUFFIX[inacbgCode.split('-').at(-1) ?? ''] ?? null;
}

// Permenkes 3/2023 Lampiran III: tarif klaim menunjuk sel tabelnya (regional, kelas RS, kelas rawat); severity lain dibaca dari sel yang sama.
@Injectable()
export class InacbgTariffSchedule extends TariffSchedule {
  private readonly syntheticSchedule = new SyntheticTariffSchedule();

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findClaimTariffs(
    inacbgCode: string,
    tariffAmount: number,
  ): Promise<TariffBySeverity | null> {
    const groupCode = toInacbgGroupCode(inacbgCode);
    const cells = await this.prisma.inacbgTariff.findMany({
      where: { inacbgCode, amount: tariffAmount },
      select: { regional: true, hospital: true, careClass: true },
    });
    if (cells.length === 0) {
      const severityLevel = severityOf(inacbgCode);
      const findSynthetic = (level: number) =>
        this.syntheticSchedule.findTariff(groupCode, level);
      return severityLevel !== null &&
        findSynthetic(severityLevel) === tariffAmount
        ? findSynthetic
        : null;
    }

    const siblings = await this.prisma.inacbgTariff.findMany({
      where: { inacbgCode: { startsWith: `${groupCode}-` }, OR: cells },
      select: { inacbgCode: true, amount: true },
    });
    const amountsBySeverity = new Map<number, Set<number>>();
    for (const sibling of siblings) {
      const level = severityOf(sibling.inacbgCode);
      if (level === null) continue;
      amountsBySeverity.set(
        level,
        (amountsBySeverity.get(level) ?? new Set()).add(
          sibling.amount.toNumber(),
        ),
      );
    }
    return (level) => {
      const amounts = amountsBySeverity.get(level);
      return amounts?.size === 1 ? [...amounts][0] : null;
    };
  }
}
