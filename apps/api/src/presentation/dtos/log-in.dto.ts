import { IsEmail, IsOptional, Matches } from 'class-validator';

export class LogInDto {
  @IsEmail()
  email!: string;

  /** Omitted only by demo accounts when `DEMO_LOGIN_ENABLED` is on. */
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code?: string;
}
