-- AlterTable
ALTER TABLE "clinical_documents" ADD COLUMN     "extracted_at" TIMESTAMPTZ(3),
ADD COLUMN     "extraction_input_tokens" INTEGER,
ADD COLUMN     "extraction_output_tokens" INTEGER;
