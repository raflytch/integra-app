export type TariffBySeverity = (severityLevel: number) => number | null;

export abstract class TariffSchedule {
  abstract findClaimTariffs(
    inacbgCode: string,
    tariffAmount: number,
  ): Promise<TariffBySeverity | null>;
}
