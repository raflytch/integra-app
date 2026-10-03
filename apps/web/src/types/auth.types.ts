export type UserRole = 'VERIFIER' | 'SUPERVISOR';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
