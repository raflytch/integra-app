import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/services/auth.service';

export const CURRENT_USER_QUERY_KEY = ['auth', 'me'];

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
  });
}
