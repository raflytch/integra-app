import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { DocumentType } from '../../domain/claims/claim-detail';
import type { DecisionAction } from '../../domain/decisions/decision';

const DOCUMENT_TYPES: DocumentType[] = [
  'MEDICAL_RESUME',
  'EXAM_NOTE',
  'DAILY_NOTE',
  'PRESCRIPTION',
  'PROCEDURE',
];
const DECISION_ACTIONS: DecisionAction[] = [
  'APPROVE',
  'REQUEST_CLARIFICATION',
  'ESCALATE',
];

export class RecordDecisionDto {
  @IsIn(DECISION_ACTIONS)
  action!: DecisionAction;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(DOCUMENT_TYPES.length)
  @IsIn(DOCUMENT_TYPES, { each: true })
  missingDocumentTypes: DocumentType[] = [];
}
