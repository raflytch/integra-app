import { Module } from '@nestjs/common';
import { SessionTokenService } from '../../application/ports/session-token.port';
import { HmacSessionTokenService } from './hmac-session-token.service';

@Module({
  providers: [
    { provide: SessionTokenService, useClass: HmacSessionTokenService },
  ],
  exports: [SessionTokenService],
})
export class SessionTokenModule {}
