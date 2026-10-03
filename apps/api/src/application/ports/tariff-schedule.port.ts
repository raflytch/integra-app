export abstract class TariffSchedule {
  abstract findTariff(
    inacbgGroupCode: string,
    severityLevel: number,
  ): number | null;
}
