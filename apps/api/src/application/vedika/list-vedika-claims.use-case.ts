import type {
  VedikaClaimPage,
  VedikaClaimQuery,
} from '../../domain/vedika/vedika-claim-summary';
import type { VedikaRepository } from '../../domain/vedika/vedika.repository';

export class ListVedikaClaimsUseCase {
  constructor(private readonly vedikaRepository: VedikaRepository) {}

  execute(query: VedikaClaimQuery): Promise<VedikaClaimPage> {
    return this.vedikaRepository.findClaimPage(query);
  }
}
