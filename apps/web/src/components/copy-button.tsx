'use client';

import { useEffect, useState } from 'react';
import { LuCheck, LuCopy } from 'react-icons/lu';
import { Button } from '@/components/ui/button';

const COPIED_FEEDBACK_MS = 2000;

/** Copies `value` to the clipboard and confirms with a check for two seconds. */
export function CopyButton({ value }: { value: string }) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const timeout = window.setTimeout(
      () => setIsCopied(false),
      COPIED_FEEDBACK_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [isCopied]);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      onClick={copyValue}
      aria-label={isCopied ? `${value} tersalin` : `Salin ${value}`}
    >
      {isCopied ? (
        <LuCheck aria-hidden="true" />
      ) : (
        <LuCopy aria-hidden="true" />
      )}
      <span aria-live="polite">{isCopied ? 'Tersalin' : 'Salin'}</span>
    </Button>
  );
}
