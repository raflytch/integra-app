export abstract class QrCodeRenderer {
  /** PNG data URL (`data:image/png;base64,...`) encoding `text`. */
  abstract toDataUrl(text: string): Promise<string>;
}
