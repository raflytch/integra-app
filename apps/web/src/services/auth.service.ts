import { isAxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import type {
  CurrentUser,
  EmailStatus,
  EnrollmentChallenge,
} from '@/types/auth.types';

/** Omit `code` only for demo accounts whose email status says no code is required. */
export async function logIn(credentials: {
  email: string;
  code?: string;
}): Promise<CurrentUser> {
  const response = await apiClient.post<CurrentUser>(
    '/auth/login',
    credentials,
  );
  return response.data;
}

export async function checkEmailStatus(email: string): Promise<EmailStatus> {
  const response = await apiClient.post<EmailStatus>('/auth/email-status', {
    email,
  });
  return response.data;
}

export async function startEnrollment(account: {
  email: string;
  name: string;
}): Promise<EnrollmentChallenge> {
  const response = await apiClient.post<EnrollmentChallenge>(
    '/auth/enrollments',
    account,
  );
  return response.data;
}

export async function confirmEnrollment(confirmation: {
  enrollmentToken: string;
  code: string;
}): Promise<CurrentUser> {
  const response = await apiClient.post<CurrentUser>(
    '/auth/enrollments/confirm',
    confirmation,
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

/** HTTP status of a failed API call, or undefined when the server was not reached. */
export function getErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}
