import {
  IsBase64,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { MAX_VEDIKA_ATTACHMENT_BYTES } from '../../domain/vedika/vedika-attachment';

const MAX_BASE64_LENGTH = Math.ceil(MAX_VEDIKA_ATTACHMENT_BYTES / 3) * 4;
const MIME_TYPE_PATTERN = /^[\w.+-]+\/[\w.+-]+$/;

export class SendVedikaAttachmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @Matches(MIME_TYPE_PATTERN)
  @MaxLength(127)
  mimeType!: string;

  @IsBase64()
  @IsNotEmpty()
  @MaxLength(MAX_BASE64_LENGTH)
  contentBase64!: string;
}
