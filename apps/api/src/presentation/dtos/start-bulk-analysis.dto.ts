import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { MAX_BULK_ANALYSIS_CLAIMS } from '../../application/analysis/bulk-analysis';

export class StartBulkAnalysisDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_ANALYSIS_CLAIMS)
  @IsUUID('all', { each: true })
  claimIds!: string[];

  @IsBoolean()
  confirmWithAi!: boolean;
}
