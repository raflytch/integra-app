-- CreateTable
CREATE TABLE "decision_document_requests" (
    "id" UUID NOT NULL,
    "decision_id" UUID NOT NULL,
    "document_type" "document_type" NOT NULL,
    "received_at" TIMESTAMPTZ(3),

    CONSTRAINT "decision_document_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "decision_document_requests_decision_id_document_type_key" ON "decision_document_requests"("decision_id", "document_type");

-- AddForeignKey
ALTER TABLE "decision_document_requests" ADD CONSTRAINT "decision_document_requests_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
