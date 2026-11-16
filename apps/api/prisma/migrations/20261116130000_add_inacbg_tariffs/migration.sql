-- CreateTable
CREATE TABLE "inacbg_tariffs" (
    "id" UUID NOT NULL,
    "regional" SMALLINT NOT NULL,
    "hospital" TEXT NOT NULL,
    "inacbg_code" TEXT NOT NULL,
    "care_class" SMALLINT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "inacbg_tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inacbg_tariffs_inacbg_code_amount_idx" ON "inacbg_tariffs"("inacbg_code", "amount");

-- CreateIndex
CREATE UNIQUE INDEX "inacbg_tariffs_regional_hospital_inacbg_code_care_class_key" ON "inacbg_tariffs"("regional", "hospital", "inacbg_code", "care_class");

