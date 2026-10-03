import { Transform } from 'class-transformer';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import type { DecisionAction } from '../../domain/decisions/decision';

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
}
