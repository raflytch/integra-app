-- CreateEnum
CREATE TYPE "care_type" AS ENUM ('OUTPATIENT', 'INPATIENT');

-- AlterTable
ALTER TABLE "claims" ADD COLUMN "care_type" "care_type";

UPDATE "claims"
SET "care_type" = CASE
  WHEN "discharged_at" = "admitted_at" THEN 'OUTPATIENT'::"care_type"
  ELSE 'INPATIENT'::"care_type"
END;

ALTER TABLE "claims" ALTER COLUMN "care_type" SET NOT NULL;

ALTER TABLE "claims"
  ADD CONSTRAINT "claims_outpatient_same_day_check" CHECK ("care_type" <> 'OUTPATIENT' OR "discharged_at" = "admitted_at");
