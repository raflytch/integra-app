import type { NewUser } from './user';

/** Shared demo accounts created by `npm run seed:users`. */
export const DEMO_ACCOUNTS: NewUser[] = [
  {
    email: 'verifikator@integra.local',
    name: 'Verifikator Demo',
    role: 'VERIFIER',
  },
  {
    email: 'supervisor@integra.local',
    name: 'Supervisor Demo',
    role: 'SUPERVISOR',
  },
];
