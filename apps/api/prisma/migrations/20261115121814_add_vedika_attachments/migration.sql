-- CreateTable
CREATE TABLE "vedika_attachments" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced_at" TIMESTAMPTZ(3),

    CONSTRAINT "vedika_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vedika_attachments_claim_id_created_at_idx" ON "vedika_attachments"("claim_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "vedika_attachments_uploaded_by_id_idx" ON "vedika_attachments"("uploaded_by_id");

-- AddForeignKey
ALTER TABLE "vedika_attachments" ADD CONSTRAINT "vedika_attachments_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vedika_attachments" ADD CONSTRAINT "vedika_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Size limit enforced by the API; kept here so no oversized file reaches the table.
ALTER TABLE "vedika_attachments" ADD CONSTRAINT "vedika_attachments_size_bytes_check" CHECK ("size_bytes" BETWEEN 1 AND 5242880);
