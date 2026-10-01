import { Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verify } from 'otplib';
import { TotpVerifier } from '../../application/ports/totp-verifier.port';

const ISSUER = 'INTEGRA';
/** Accept one 30 s step either side to absorb phone clock drift. */
const EPOCH_TOLERANCE_SECONDS = 30;
const CODE_PATTERN = /^\d{6}$/;

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s) via otplib, compatible with common authenticator apps. */
@Injectable()
export class OtplibTotpVerifier extends TotpVerifier {
  generateSecret(): string {
    return generateSecret();
  }

  buildEnrollmentUri(accountEmail: string, secret: string): string {
    return generateURI({ issuer: ISSUER, label: accountEmail, secret });
  }

  async verify(
    secret: string,
    code: string,
    lastUsedStep: number | null,
  ): Promise<number | null> {
    if (!CODE_PATTERN.test(code)) return null;

    const result = await verify({
      secret,
      token: code,
      epochTolerance: EPOCH_TOLERANCE_SECONDS,
      // otplib rejects steps <= afterTimeStep, which blocks code reuse.
      ...(lastUsedStep === null ? {} : { afterTimeStep: lastUsedStep }),
    });

    return result.valid && 'timeStep' in result ? result.timeStep : null;
  }
}
