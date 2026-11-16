-- CreateTable
CREATE TABLE "vedika_responses" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "synced_at" TIMESTAMPTZ(3) NOT NULL,
    "response" JSONB NOT NULL,

    CONSTRAINT "vedika_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vedika_responses_claim_id_key" ON "vedika_responses"("claim_id");

-- AddForeignKey
ALTER TABLE "vedika_responses" ADD CONSTRAINT "vedika_responses_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
