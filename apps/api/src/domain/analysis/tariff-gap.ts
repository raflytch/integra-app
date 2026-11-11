const LOWEST_SEVERITY_LEVEL = 1;
const SEVERITY_SUFFIX_PATTERN = /-(I{1,3})$/;

export function toInacbgGroupCode(inacbgCode: string): string {
  return inacbgCode.replace(SEVERITY_SUFFIX_PATTERN, '');
}

export function calculateTariffGaps(
  severityLevel: number,
  claimTariff: number,
  unsupportedDiagnosisCount: number,
  findTariffForSeverity: (severityLevel: number) => number | null,
): (number | null)[] {
  // An imported claim can carry a real tariff the schedule does not know; its gap is then unknown.
  if (findTariffForSeverity(severityLevel) !== claimTariff) {
    return Array.from({ length: unsupportedDiagnosisCount }, () => null);
  }
  return Array.from(
    { length: unsupportedDiagnosisCount },
    (_, removedIndex) => {
      const currentSeverity = severityLevel - removedIndex;
      const loweredSeverity = currentSeverity - 1;
      if (loweredSeverity < LOWEST_SEVERITY_LEVEL) return 0;
      const currentTariff = findTariffForSeverity(currentSeverity);
      const loweredTariff = findTariffForSeverity(loweredSeverity);
      if (currentTariff === null || loweredTariff === null) return null;
      return currentTariff - loweredTariff;
    },
  );
}
