export type UserRole = 'VERIFIER' | 'SUPERVISOR';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface EmailStatus {
  registered: boolean;
}

/** A pending sign-up: the account is created only after the code is confirmed. */
export interface EnrollmentChallenge {
  enrollmentToken: string;
  setupKey: string;
  qrCodeDataUrl: string;
  expiresAt: string;
  expiresInSeconds: number;
}
