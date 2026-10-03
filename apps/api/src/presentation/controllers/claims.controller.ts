import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { GetClaimDetailUseCase } from '../../application/claims/get-claim-detail.use-case';
import { GetClaimStatisticsUseCase } from '../../application/claims/get-claim-statistics.use-case';
import { ListClaimQueueUseCase } from '../../application/claims/list-claim-queue.use-case';
import { RecordDecisionUseCase } from '../../application/decisions/record-decision.use-case';
import type { SessionClaims } from '../../application/ports/session-token.port';
import { CurrentSession } from '../auth/auth.decorators';
import { RecordDecisionDto } from '../dtos/record-decision.dto';
import { ListClaimsQuery } from '../dtos/list-claims.query';
import {
  type ClaimDetailResponse,
  presentClaimDetail,
} from '../presenters/claim-detail.presenter';
import type { ClaimStatistics } from '../../domain/claims/claim-queue-item';
import {
  type ClaimQueuePageResponse,
  presentClaimQueuePage,
} from '../presenters/claim-queue.presenter';
import {
  type DecisionResponse,
  presentDecision,
} from '../presenters/decision.presenter';

@Controller('claims')
export class ClaimsController {
  constructor(
    private readonly getClaimDetail: GetClaimDetailUseCase,
    private readonly listClaimQueue: ListClaimQueueUseCase,
    private readonly getClaimStatistics: GetClaimStatisticsUseCase,
    private readonly recordDecision: RecordDecisionUseCase,
  ) {}

  @Get()
  async list(@Query() query: ListClaimsQuery): Promise<ClaimQueuePageResponse> {
    return presentClaimQueuePage(await this.listClaimQueue.execute(query));
  }

  /** Declared before `:claimId` so "statistics" is never parsed as an id. */
  @Get('statistics')
  findStatistics(): Promise<ClaimStatistics> {
    return this.getClaimStatistics.execute();
  }

  @Get(':claimId')
  async findDetail(
    @Param('claimId', ParseUUIDPipe) claimId: string,
  ): Promise<ClaimDetailResponse> {
    return presentClaimDetail(await this.getClaimDetail.execute(claimId));
  }

  @Post(':claimId/decisions')
  async createDecision(
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @Body() decisionInput: RecordDecisionDto,
    @CurrentSession() session: SessionClaims,
  ): Promise<DecisionResponse> {
    const decision = await this.recordDecision.execute({
      claimId,
      verifierId: session.userId,
      ...decisionInput,
    });
    return presentDecision(decision);
  }
}
