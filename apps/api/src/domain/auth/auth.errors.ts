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

export class EmailAlreadyRegisteredError extends DomainError {
  readonly code = 'EMAIL_ALREADY_REGISTERED';

  constructor() {
    super('Email ini sudah terdaftar, silakan masuk');
  }
}

export class EnrollmentExpiredError extends DomainError {
  readonly code = 'ENROLLMENT_EXPIRED';

  constructor() {
    super('Waktu pendaftaran habis, buat kode QR baru');
  }
}

export class InvalidEnrollmentCodeError extends DomainError {
  readonly code = 'INVALID_ENROLLMENT_CODE';

  constructor() {
    super('Kode authenticator tidak cocok, coba kode berikutnya');
  }
}
