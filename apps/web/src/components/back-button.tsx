'use client';

import { useRouter } from 'next/navigation';
import { LuArrowLeft } from 'react-icons/lu';
import { Button } from '@/components/ui/button';

/** Goes back in history, or home when the page was opened directly. */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push('/');
  }

  return (
    <Button variant="outline" size="lg" className={className} onClick={goBack}>
      <LuArrowLeft aria-hidden="true" />
      Halaman sebelumnya
    </Button>
  );
}
