/** Symmetric encryption for secrets stored at rest, such as TOTP seeds. */
export abstract class SecretCipher {
  /**
   * @param context Binds the ciphertext to its owner (e.g. user id) so it
   * cannot be decrypted after being copied to another row.
   */
  abstract encrypt(plain: string, context: string): string;

  /** Throws when the payload is malformed, tampered with, or bound to another context. */
  abstract decrypt(payload: string, context: string): string;
}
