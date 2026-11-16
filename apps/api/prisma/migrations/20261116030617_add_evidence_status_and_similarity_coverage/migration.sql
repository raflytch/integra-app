-- CreateEnum
CREATE TYPE "evidence_status" AS ENUM ('SUPPORTED', 'PARTIAL', 'NOT_FOUND', 'REFUTED');

-- AlterTable
ALTER TABLE "claim_diagnoses" ADD COLUMN     "evidence_status" "evidence_status";

-- AlterTable
ALTER TABLE "claims" ADD COLUMN     "compared_claim_count" INTEGER,
ADD COLUMN     "max_similarity" DOUBLE PRECISION;
