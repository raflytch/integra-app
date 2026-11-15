import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
} from '@nestjs/common';
import type { SessionClaims } from '../../application/ports/session-token.port';
import { DownloadVedikaAttachmentUseCase } from '../../application/vedika/download-vedika-attachment.use-case';
import { GetVedikaStatusUseCase } from '../../application/vedika/get-vedika-status.use-case';
import { SendVedikaAttachmentUseCase } from '../../application/vedika/send-vedika-attachment.use-case';
import { CurrentSession } from '../auth/auth.decorators';
import { SendVedikaAttachmentDto } from '../dtos/send-vedika-attachment.dto';
import {
  presentVedikaAttachment,
  presentVedikaStatus,
  type VedikaAttachmentResponse,
  type VedikaStatusResponse,
} from '../presenters/vedika.presenter';

@Controller('claims/:claimId/vedika')
export class VedikaController {
  constructor(
    private readonly getVedikaStatus: GetVedikaStatusUseCase,
    private readonly sendVedikaAttachment: SendVedikaAttachmentUseCase,
    private readonly downloadVedikaAttachment: DownloadVedikaAttachmentUseCase,
  ) {}

  @Get()
  async findStatus(
    @Param('claimId', ParseUUIDPipe) claimId: string,
  ): Promise<VedikaStatusResponse> {
    return presentVedikaStatus(await this.getVedikaStatus.execute(claimId));
  }

  @Post('attachments')
  async sendAttachment(
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @Body() { fileName, mimeType, contentBase64 }: SendVedikaAttachmentDto,
    @CurrentSession() session: SessionClaims,
  ): Promise<VedikaAttachmentResponse> {
    const attachment = await this.sendVedikaAttachment.execute({
      claimId,
      uploadedById: session.userId,
      fileName,
      mimeType,
      content: Buffer.from(contentBase64, 'base64'),
    });
    return presentVedikaAttachment(attachment);
  }

  @Get('attachments/:attachmentId/file')
  async downloadAttachment(
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<StreamableFile> {
    const file = await this.downloadVedikaAttachment.execute(
      claimId,
      attachmentId,
    );
    return new StreamableFile(file.content, {
      type: file.mimeType,
      disposition: `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    });
  }
}
