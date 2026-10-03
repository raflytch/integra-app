import { useEffect, useState } from 'react';

/** `value`, updated only after it stops changing for `delayMs`. */
export function useDebouncedValue<Value>(value: Value, delayMs: number): Value {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedValue(value),
      delayMs,
    );
    return () => window.clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}
