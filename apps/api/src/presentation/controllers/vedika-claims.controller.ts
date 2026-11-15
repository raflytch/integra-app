import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ListVedikaClaimsUseCase } from '../../application/vedika/list-vedika-claims.use-case';
import { RefreshAllVedikaUseCase } from '../../application/vedika/refresh-all-vedika.use-case';
import { ListVedikaClaimsQuery } from '../dtos/list-vedika-claims.query';
import {
  presentVedikaBulkRefresh,
  presentVedikaClaimPage,
  type VedikaBulkRefreshResponse,
  type VedikaClaimPageResponse,
} from '../presenters/vedika.presenter';

@Controller('vedika')
export class VedikaClaimsController {
  constructor(
    private readonly listVedikaClaims: ListVedikaClaimsUseCase,
    private readonly refreshAllVedika: RefreshAllVedikaUseCase,
  ) {}

  @Get('claims')
  async list(
    @Query() query: ListVedikaClaimsQuery,
  ): Promise<VedikaClaimPageResponse> {
    return presentVedikaClaimPage(await this.listVedikaClaims.execute(query));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshAll(): Promise<VedikaBulkRefreshResponse> {
    return presentVedikaBulkRefresh(await this.refreshAllVedika.execute());
  }
}
