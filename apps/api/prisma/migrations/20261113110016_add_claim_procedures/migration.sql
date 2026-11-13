-- CreateTable
CREATE TABLE "claim_procedures" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "icd9cm_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "claim_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "claim_procedures_claim_id_icd9cm_code_key" ON "claim_procedures"("claim_id", "icd9cm_code");

-- AddForeignKey
ALTER TABLE "claim_procedures" ADD CONSTRAINT "claim_procedures_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
