ALTER TABLE "claims" DROP CONSTRAINT "claims_severity_level_check";

ALTER TABLE "claims"
  ADD CONSTRAINT "claims_severity_level_check" CHECK ("severity_level" BETWEEN 0 AND 3);
