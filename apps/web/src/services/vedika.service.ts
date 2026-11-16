import { apiClient } from '@/lib/api-client';
import type {
  ScannedSep,
  VedikaAttachment,
  VedikaBulkRefreshResult,
  VedikaClaimPage,
  VedikaClaimParams,
  VedikaStatus,
} from '@/types/vedika.types';

export const MAX_VEDIKA_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function fetchVedikaClaimPage(
  params: VedikaClaimParams,
): Promise<VedikaClaimPage> {
  const response = await apiClient.get<VedikaClaimPage>('/vedika/claims', {
    params,
  });
  return response.data;
}

export async function fetchVedikaStatus(
  claimId: string,
): Promise<VedikaStatus> {
  const response = await apiClient.get<VedikaStatus>(
    `/claims/${claimId}/vedika`,
  );
  return response.data;
}

export async function scanVedikaSep(claimId: string): Promise<ScannedSep> {
  const response = await apiClient.get<ScannedSep>(
    `/claims/${claimId}/vedika/sep-scan`,
  );
  return response.data;
}

export async function sendVedikaAttachment(
  claimId: string,
  file: File,
): Promise<VedikaAttachment> {
  const response = await apiClient.post<VedikaAttachment>(
    `/claims/${claimId}/vedika/attachments`,
    {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      contentBase64: await readFileAsBase64(file),
    },
  );
  return response.data;
}

export async function fetchVedikaAttachmentFile(
  claimId: string,
  attachmentId: string,
): Promise<ArrayBuffer> {
  const response = await apiClient.get<ArrayBuffer>(
    `/claims/${claimId}/vedika/attachments/${attachmentId}/file`,
    { responseType: 'arraybuffer', timeout: 30000 },
  );
  return response.data;
}

export async function refreshAllVedika(): Promise<VedikaBulkRefreshResult> {
  const response =
    await apiClient.post<VedikaBulkRefreshResult>('/vedika/refresh');
  return response.data;
}

export function buildVedikaAttachmentUrl(
  claimId: string,
  attachmentId: string,
): string {
  return apiClient.getUri({
    url: `/claims/${claimId}/vedika/attachments/${attachmentId}/file`,
  });
}
