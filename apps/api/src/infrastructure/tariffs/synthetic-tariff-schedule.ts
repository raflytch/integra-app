import { Injectable } from '@nestjs/common';
import { TariffSchedule } from '../../application/ports/tariff-schedule.port';

const SYNTHETIC_TARIFFS_BY_INACBG_GROUP: Readonly<
  Record<string, Readonly<Record<number, number>>>
> = {
  'A-4-14': { 1: 4_200_000, 2: 5_730_000, 3: 9_850_000 },
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
