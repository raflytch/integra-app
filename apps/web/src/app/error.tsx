'use client';

import { ErrorStatusPage } from '@/components/error-status-page';

export default function ErrorPage(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorStatusPage {...props} />;
}
