const MASK_CHARACTER = '•';

/** "Budi Santoso" → "B••• S••••••": each word keeps its first letter for recognition. */
export function maskPersonName(name: string): string {
  return name.replace(
    /\S+/g,
    (word) => word[0] + MASK_CHARACTER.repeat(word.length - 1),
  );
}

/** Keeps the last four characters, enough to match a record without exposing it. */
export function maskIdentifier(value: string): string {
  const visibleCount = 4;
  if (value.length <= visibleCount) return MASK_CHARACTER.repeat(value.length);
  return (
    MASK_CHARACTER.repeat(value.length - visibleCount) +
    value.slice(-visibleCount)
  );
}
