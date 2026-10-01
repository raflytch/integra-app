import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretCipher } from '../../application/ports/secret-cipher.port';
import type { Env } from '../config/env.schema';

const ALGORITHM = 'aes-256-gcm';
/** Bump when the key or format changes so old payloads stay readable during rotation. */
const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * AES-256-GCM with a random IV per message. Payload format:
 * `v1.<iv>.<tag>.<ciphertext>` (base64 parts). The context is bound as
 * additional authenticated data, so decrypting with another context fails.
 */
@Injectable()
export class AesGcmSecretCipher extends SecretCipher {
  private readonly key: Buffer;

  constructor(@Inject(ConfigService) config: ConfigService<Env, true>) {
    super();
    // Read into a local first: inline, `get` infers its type from Buffer.from's overloads.
    const encodedKey = config.get('TOTP_ENCRYPTION_KEY', { infer: true });
    this.key = Buffer.from(encodedKey, 'base64');
  }

  encrypt(plain: string, context: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: TAG_BYTES,
    });
    cipher.setAAD(Buffer.from(context, 'utf8'));
    const ciphertext = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    const parts = [iv, cipher.getAuthTag(), ciphertext].map((part) =>
      part.toString('base64'),
    );
    return [VERSION, ...parts].join('.');
  }

  decrypt(payload: string, context: string): string {
    const [version, ...encoded] = payload.split('.');
    const [iv, tag, ciphertext] = encoded.map((part) =>
      Buffer.from(part, 'base64'),
    );
    if (
      version !== VERSION ||
      encoded.length !== 3 ||
      iv?.length !== IV_BYTES ||
      tag?.length !== TAG_BYTES ||
      !ciphertext
    ) {
      throw new Error('Malformed secret payload');
    }

    // Pinning authTagLength rejects truncated tags, which would weaken authentication.
    const decipher = createDecipheriv(ALGORITHM, this.key, iv, {
      authTagLength: TAG_BYTES,
    });
    decipher.setAAD(Buffer.from(context, 'utf8'));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }
}
