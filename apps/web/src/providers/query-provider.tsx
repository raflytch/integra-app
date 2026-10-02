'use client';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { LOGIN_PATH } from '@/lib/api-client';
import { isUnauthorizedError } from '@/services/auth.service';

export function QueryProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [client] = useState(() => {
    function redirectWhenSessionMissing(error: unknown) {
      const currentPathname = window.location.pathname;
      if (!isUnauthorizedError(error) || currentPathname === LOGIN_PATH) return;
      router.replace(
        `${LOGIN_PATH}?next=${encodeURIComponent(currentPathname)}`,
      );
    }
    return new QueryClient({
      queryCache: new QueryCache({ onError: redirectWhenSessionMissing }),
      mutationCache: new MutationCache({ onError: redirectWhenSessionMissing }),
      defaultOptions: {
        queries: { staleTime: 60_000, retry: 1 },
      },
    });
  });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
