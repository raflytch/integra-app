'use client';

import { ErrorStatusPage } from '@/components/error-status-page';
import './globals.css';

/** Replaces the root layout when it fails, so it brings its own html and body. */
export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body>
        <ErrorStatusPage {...props} />
      </body>
    </html>
  );
}
