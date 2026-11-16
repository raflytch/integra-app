import type { VedikaBulkRefreshResult } from '../../domain/vedika/vedika-claim-summary';
import type { VedikaRepository } from '../../domain/vedika/vedika.repository';

export class RefreshAllVedikaUseCase {
  constructor(private readonly vedikaRepository: VedikaRepository) {}

  async execute(): Promise<VedikaBulkRefreshResult> {
    const syncedAt = new Date();
    const result = await this.vedikaRepository.syncAllClaims(syncedAt);
    return { ...result, syncedAt };
  }
}
