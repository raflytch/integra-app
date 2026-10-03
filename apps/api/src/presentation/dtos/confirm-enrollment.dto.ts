import { IsString, Matches, MaxLength } from 'class-validator';

export class ConfirmEnrollmentDto {
  @IsString()
  @MaxLength(2000)
  enrollmentToken!: string;

  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code!: string;
}
