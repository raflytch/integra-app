import { Injectable } from '@nestjs/common';
import { TariffSchedule } from '../../application/ports/tariff-schedule.port';

/** Synthetic rupiah amounts per severity level for the demo dataset, not official INA-CBG tariffs. */
const SYNTHETIC_TARIFFS_BY_INACBG_GROUP: Readonly<
  Record<string, Readonly<Record<number, number>>>
> = {
  'A-4-14': { 1: 4_200_000, 2: 5_730_000, 3: 9_850_000 },
  'J-4-16': { 1: 4_800_000, 2: 6_900_000, 3: 10_400_000 },
  'K-4-17': { 1: 2_900_000, 2: 3_800_000, 3: 5_600_000 },
};

@Injectable()
export class SyntheticTariffSchedule extends TariffSchedule {
  findTariff(inacbgGroupCode: string, severityLevel: number): number | null {
    return (
      SYNTHETIC_TARIFFS_BY_INACBG_GROUP[inacbgGroupCode]?.[severityLevel] ??
      null
    );
  }
}
