import { isAxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import type { CurrentUser } from '@/types/auth.types';

export async function logIn(credentials: {
  email: string;
  code: string;
}): Promise<CurrentUser> {
  const response = await apiClient.post<CurrentUser>(
    '/auth/login',
    credentials,
  );
  return response.data;
}

export async function logOut(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const response = await apiClient.get<CurrentUser>('/auth/me');
  return response.data;
}

export function isUnauthorizedError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}

export function isForbiddenError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 403;
}

export function isTooManyRequestsError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 429;
}
