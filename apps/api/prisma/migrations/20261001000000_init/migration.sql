-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('VERIFIER', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "facility_type" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "claim_status" AS ENUM ('PENDING', 'APPROVED', 'CLARIFICATION_REQUESTED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "injected_case" AS ENUM ('UPCODING', 'EXAM_MANIPULATION', 'CLONING');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('MEDICAL_RESUME', 'EXAM_NOTE', 'DAILY_NOTE', 'PRESCRIPTION', 'PROCEDURE');

-- CreateEnum
CREATE TYPE "evidence_type" AS ENUM ('MEDICATION', 'PROCEDURE', 'FINDING', 'VITAL_SIGN');

-- CreateEnum
CREATE TYPE "test_type" AS ENUM ('EXISTENCE', 'CONSISTENCY', 'SIMILARITY');

-- CreateEnum
CREATE TYPE "decision_action" AS ENUM ('APPROVE', 'REQUEST_CLARIFICATION', 'ESCALATE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "totp_secret_enc" TEXT NOT NULL,
    "totp_last_step" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "facility_type" NOT NULL,
    "city" TEXT NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "medical_record_no" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "gender" NOT NULL,
    "birth_date" DATE NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" UUID NOT NULL,
    "claim_no" TEXT NOT NULL,
    "facility_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "admitted_at" DATE NOT NULL,
    "discharged_at" DATE NOT NULL,
    "inacbg_code" TEXT NOT NULL,
    "severity_level" SMALLINT NOT NULL,
    "tariff_amount" DECIMAL(14,2) NOT NULL,
    "potential_gap" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "priority_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "claim_status" NOT NULL DEFAULT 'PENDING',
    "injected_case" "injected_case"[] DEFAULT ARRAY[]::"injected_case"[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_diagnoses" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "icd10_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "claim_diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_documents" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "type" "document_type" NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL,
    "content" TEXT NOT NULL,
    "extracted" JSONB,

    CONSTRAINT "clinical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_rules" (
    "id" UUID NOT NULL,
    "icd10_code" TEXT NOT NULL,
    "evidence_type" "evidence_type" NOT NULL,
    "expected" TEXT NOT NULL,
    "guideline_ref" TEXT NOT NULL,

    CONSTRAINT "evidence_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "test_type" "test_type" NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "citations" JSONB NOT NULL DEFAULT '[]',
    "document_id" UUID,
    "related_document_id" UUID,
    "diagnosis_id" UUID,
    "related_claim_id" UUID,
    "similarity" DOUBLE PRECISION,
    "tariff_gap" DECIMAL(14,2),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "verifier_id" UUID NOT NULL,
    "action" "decision_action" NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_code_key" ON "facilities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "patients_medical_record_no_key" ON "patients"("medical_record_no");

-- CreateIndex
CREATE UNIQUE INDEX "claims_claim_no_key" ON "claims"("claim_no");

-- CreateIndex
CREATE INDEX "claims_status_priority_score_idx" ON "claims"("status", "priority_score" DESC);

-- CreateIndex
CREATE INDEX "claims_facility_id_idx" ON "claims"("facility_id");

-- CreateIndex
CREATE INDEX "claims_patient_id_idx" ON "claims"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "claim_diagnoses_claim_id_icd10_code_key" ON "claim_diagnoses"("claim_id", "icd10_code");

-- CreateIndex
CREATE INDEX "clinical_documents_claim_id_recorded_at_idx" ON "clinical_documents"("claim_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_rules_icd10_code_evidence_type_expected_key" ON "evidence_rules"("icd10_code", "evidence_type", "expected");

-- CreateIndex
CREATE INDEX "findings_claim_id_test_type_idx" ON "findings"("claim_id", "test_type");

-- CreateIndex
CREATE INDEX "findings_related_claim_id_idx" ON "findings"("related_claim_id");

-- CreateIndex
CREATE UNIQUE INDEX "findings_claim_id_related_claim_id_test_type_key" ON "findings"("claim_id", "related_claim_id", "test_type");

-- CreateIndex
CREATE INDEX "decisions_claim_id_created_at_idx" ON "decisions"("claim_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "decisions_verifier_id_idx" ON "decisions"("verifier_id");

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_diagnoses" ADD CONSTRAINT "claim_diagnoses_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_related_claim_id_fkey" FOREIGN KEY ("related_claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "clinical_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_related_document_id_fkey" FOREIGN KEY ("related_document_id") REFERENCES "clinical_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_diagnosis_id_fkey" FOREIGN KEY ("diagnosis_id") REFERENCES "claim_diagnoses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_verifier_id_fkey" FOREIGN KEY ("verifier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraints Prisma cannot express. Keep in sync with the "DB constraints"
-- notes in schema.prisma.

-- AddCheckConstraint
ALTER TABLE "claims"
  ADD CONSTRAINT "claims_discharge_after_admission_check" CHECK ("discharged_at" >= "admitted_at"),
  ADD CONSTRAINT "claims_severity_level_check" CHECK ("severity_level" BETWEEN 1 AND 3),
  ADD CONSTRAINT "claims_priority_score_check" CHECK ("priority_score" >= 0);

-- AddCheckConstraint
ALTER TABLE "findings"
  ADD CONSTRAINT "findings_strength_check" CHECK ("strength" BETWEEN 0 AND 1),
  ADD CONSTRAINT "findings_similarity_check" CHECK ("similarity" IS NULL OR "similarity" BETWEEN 0 AND 1);

-- CreateIndex: at most one primary diagnosis per claim
CREATE UNIQUE INDEX "claim_diagnoses_one_primary_per_claim_key" ON "claim_diagnoses"("claim_id") WHERE "is_primary";
