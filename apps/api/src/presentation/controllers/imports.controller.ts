import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import type { ZodType } from 'zod';
import {
  importClaimsInputSchema,
  previewClaimImportInputSchema,
} from '../../application/imports/claim-import.schema';
import { ImportClaimsUseCase } from '../../application/imports/import-claims.use-case';
import {
  type ClaimImportPreview,
  PreviewClaimImportUseCase,
} from '../../application/imports/preview-claim-import.use-case';
import type { ClaimImportResult } from '../../domain/imports/imported-claim';

/** The import format's Zod schema is the single contract, so bodies skip class-validator. */
function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'INVALID_IMPORT_REQUEST',
      message: 'The import request body is invalid',
    });
  }
  return result.data;
}

@Controller('imports')
export class ImportsController {
  constructor(
    private readonly previewClaimImport: PreviewClaimImportUseCase,
    private readonly importClaims: ImportClaimsUseCase,
  ) {}

  /** Reads a file into a preview; AI normalization runs only with `allowAi`. */
  @Post('claims/preview')
  @HttpCode(HttpStatus.OK)
  preview(@Body() body: unknown): Promise<ClaimImportPreview> {
    return this.previewClaimImport.execute(
      parseBody(previewClaimImportInputSchema, body),
    );
  }

  @Post('claims')
  async import(@Body() body: unknown): Promise<ClaimImportResult> {
    const { claims } = parseBody(importClaimsInputSchema, body);
    return this.importClaims.execute(claims);
  }
}
