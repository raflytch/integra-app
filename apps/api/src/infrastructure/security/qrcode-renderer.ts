import { Injectable } from '@nestjs/common';
import { toDataURL } from 'qrcode';
import { QrCodeRenderer } from '../../application/ports/qr-code-renderer.port';

const QR_CODE_WIDTH_PX = 320;

@Injectable()
export class QrcodeRenderer extends QrCodeRenderer {
  toDataUrl(text: string): Promise<string> {
    return toDataURL(text, { width: QR_CODE_WIDTH_PX, margin: 1 });
  }
}
