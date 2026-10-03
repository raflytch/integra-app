import { IsEmail } from 'class-validator';

export class CheckEmailStatusDto {
  @IsEmail()
  email!: string;
}
