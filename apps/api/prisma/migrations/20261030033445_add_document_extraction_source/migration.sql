-- AlterTable
ALTER TABLE "clinical_documents" ADD COLUMN     "extracted_model" TEXT,
ADD COLUMN     "extraction_prompt_version" TEXT;
