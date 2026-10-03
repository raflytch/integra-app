import { Module } from '@nestjs/common';
import { QrCodeRenderer } from '../../application/ports/qr-code-renderer.port';
import { SecretCipher } from '../../application/ports/secret-cipher.port';
import { TotpVerifier } from '../../application/ports/totp-verifier.port';
import { AesGcmSecretCipher } from './aes-gcm-secret-cipher';
import { OtplibTotpVerifier } from './otplib-totp-verifier';
import { QrcodeRenderer } from './qrcode-renderer';

@Module({
  providers: [
    { provide: SecretCipher, useClass: AesGcmSecretCipher },
    { provide: TotpVerifier, useClass: OtplibTotpVerifier },
    { provide: QrCodeRenderer, useClass: QrcodeRenderer },
  ],
  exports: [SecretCipher, TotpVerifier, QrCodeRenderer],
})
export class SecurityModule {}
