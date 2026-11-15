export const MAX_VEDIKA_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export interface VedikaAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  syncedAt: Date | null;
  uploadedBy: { id: string; name: string };
}

export interface NewVedikaAttachment {
  claimId: string;
  uploadedById: string;
  fileName: string;
  mimeType: string;
  content: Uint8Array;
}

export interface VedikaAttachmentFile {
  fileName: string;
  mimeType: string;
  content: Uint8Array;
}
