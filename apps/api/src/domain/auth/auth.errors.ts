import { DomainError } from '../shared/domain-error';

export class InvalidLoginError extends DomainError {
  readonly code = 'INVALID_LOGIN';

  constructor() {
    super('Email atau kode authenticator tidak valid');
  }
}

export class SessionExpiredError extends DomainError {
  readonly code = 'SESSION_EXPIRED';

  constructor() {
    super('Sesi berakhir, silakan masuk kembali');
  }
}
