import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { DomainError } from '../../domain/shared/domain-error';

/**
 * HTTP status per domain error code. Feature modules register their codes
 * here; unlisted codes are treated as a generic business rule violation.
 */
const STATUS_BY_CODE: Readonly<Record<string, HttpStatus>> = {};

/**
 * Translates domain errors to HTTP responses. Only `DomainError` is caught:
 * Nest's built-in handler keeps `HttpException`s (validation 400s included)
 * intact and hides details of unexpected errors behind a plain 500.
 */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(error: DomainError, host: ArgumentsHost): void {
    const status =
      STATUS_BY_CODE[error.code] ?? HttpStatus.UNPROCESSABLE_ENTITY;
    this.adapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      { statusCode: status, code: error.code, message: error.message },
      status,
    );
  }
}
