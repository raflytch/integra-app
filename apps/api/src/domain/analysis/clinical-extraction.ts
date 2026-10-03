export interface ExtractedDiagnosis {
  name: string;
  icd10Code: string | null;
  quote: string;
}

export interface ExtractedFinding {
  name: string;
  isPresent: boolean;
  observedAt: string | null;
  quote: string;
}

export interface ExtractedVitalSign {
  name: string;
  value: string;
  observedAt: string | null;
  quote: string;
}

export interface ExtractedMedication {
  name: string;
  dose: string | null;
  givenAt: string | null;
  quote: string;
}

export interface ExtractedProcedure {
  name: string;
  performedAt: string | null;
  quote: string;
}

export interface ClinicalExtraction {
  diagnoses: ExtractedDiagnosis[];
  findings: ExtractedFinding[];
  vitalSigns: ExtractedVitalSign[];
  medications: ExtractedMedication[];
  procedures: ExtractedProcedure[];
}
