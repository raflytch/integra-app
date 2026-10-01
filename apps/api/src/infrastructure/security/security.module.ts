import { Module } from '@nestjs/common';
import { SecretCipher } from '../../application/ports/secret-cipher.port';
import { TotpVerifier } from '../../application/ports/totp-verifier.port';
import { AesGcmSecretCipher } from './aes-gcm-secret-cipher';
import { OtplibTotpVerifier } from './otplib-totp-verifier';

@Module({
  providers: [
    { provide: SecretCipher, useClass: AesGcmSecretCipher },
    { provide: TotpVerifier, useClass: OtplibTotpVerifier },
  ],
  exports: [SecretCipher, TotpVerifier],
})
export class SecurityModule {}
