-- DropIndex
DROP INDEX "evidence_rules_icd10_code_evidence_type_expected_key";

-- AlterTable
ALTER TABLE "evidence_rules" ADD COLUMN     "disease" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "primary_icd10_prefixes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "evidence_rules_icd10_code_disease_evidence_type_expected_key" ON "evidence_rules"("icd10_code", "disease", "evidence_type", "expected");

