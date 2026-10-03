export type UserRole = 'VERIFIER' | 'SUPERVISOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface UserCredentials extends User {
  totpSecretEnc: string;
  totpLastStep: number | null;
}
