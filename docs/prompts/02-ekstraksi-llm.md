# Prompt 2 — M-03 Ekstraksi Bukti Klinis (LLM)

> Tempel seluruh isi file ini ke sesi agent baru di root repo `integra-app`, dari `main` terbaru yang sudah berisi M-02 Data Sintetis.

---

Kamu mengerjakan modul **M-03 Ekstraksi Bukti Klinis** untuk INTEGRA, asisten AI untuk verifikator klaim BPJS Kesehatan. Model bahasa **hanya membaca dan mengekstrak**. Penilaian dilakukan oleh aturan yang bisa diaudit (Uji Ada, Uji Konsisten, Uji Bukan Salinan). Setiap tanda harus bisa dilacak ke kutipan dokumen asli.

Buat branch `feat/m03-clinical-extraction` dari `main`.

## Aturan kerja

- Baca dulu `AGENTS.md`, `docs/contracts/README.md`, dan `docs/contracts/clinical-extraction.example.json`, lalu file berikut di `apps/api/`:
  - `prisma/schema.prisma`;
  - `src/domain/analysis/clinical-extraction.ts`, `src/domain/analysis/clinical-vocabulary.ts`, `src/domain/analysis/existence-test.ts`;
  - `src/application/ports/llm-client.port.ts`, `src/application/ports/llm.errors.ts`;
  - `src/infrastructure/llm/openai-llm.client.ts`;
  - `src/infrastructure/database/prisma/repositories/clinical-extraction.parser.ts`, `src/infrastructure/database/prisma/repositories/prisma-analysis.repository.ts`;
  - `src/analysis.module.ts`;
  - `scripts/llm-smoke.ts`, `scripts/seed-synthetic-dataset.ts`.

  Ikuti pola Clean Architecture dan gaya kode yang sudah ada.

- Use case hanya bergantung pada port `LlmClient` dan kontrak repository, tidak pernah pada `openai` atau Prisma.
- Komentar dan identifier dalam bahasa Inggris. Prompt ke LLM dalam bahasa Indonesia.
- Jangan menambah dependency baru.
- Jangan mengubah bentuk `ClinicalExtraction` maupun kontrak `clinical-extraction.example.json`. Modul lain sudah membacanya.

---

## PRD

### Tujuan

Mengubah rekam medis teks bebas menjadi bukti terstruktur (`clinical_documents.extracted`) yang bisa diuji aturan, dengan setiap butir menyimpan kutipan persis dari dokumen.

### User story

Sebagai sistem, saya ingin daftar diagnosis, temuan, tanda vital, obat, dan tindakan beserta waktunya dari setiap dokumen, supaya Uji Ada, Uji Konsisten, dan Kartu Klaim bisa menunjukkan bukti asli.

### Masuk lingkup

- Satu panggilan LLM per dokumen dengan output JSON tervalidasi Zod.
- Normalisasi nama ke kosakata kanonik untuk sinonim eksplisit.
- Pencatatan negasi eksplisit (`isPresent: false`).
- Pembuangan butir yang kutipannya tidak ada di dokumen (anti-halusinasi).
- Script CLI untuk menjalankan ekstraksi, mengulang klaim tertentu, dan mengekspor hasil ke file dataset.

### Di luar lingkup

- Penilaian klinis, label fraud, atau skor apa pun dari LLM.
- Endpoint HTTP dan UI. Kartu Klaim sudah menampilkan status `isExtracted`.

### Kriteria penerimaan

1. Semua dokumen sintetis punya `extracted` yang lolos skema.
2. Setiap `quote` adalah potongan persis dari `content` dokumennya (perbandingan setelah normalisasi spasi dan huruf kecil).
3. Catatan harian "pasien tidak sesak" menghasilkan temuan `sesak napas` dengan `isPresent: false`.
4. Tekanan darah `85/50 mmHg` tetap tercatat sebagai tanda vital, bukan temuan `hipotensi`.
5. Satu dokumen yang gagal tidak menghentikan dokumen lain, kecuali error konfigurasi.
6. Menjalankan ulang tidak memanggil LLM untuk dokumen yang sudah diekstraksi, kecuali diberi `--force`.
7. Setelah ekstraksi dan `POST /analysis/run`, Uji Ada menandai klaim `UC1_UPCODING`, `MULTI_UPCODING_EXAM`, dan `UC4_FLAGGED_BUT_VALID`, tetapi tidak menandai `GENUINE_SHOCK` maupun `GENUINE_RESP_FAILURE`.

---

## TRD

### 1. File yang dibuat atau diubah

| File                                                                              | Isi                                                                                                                                 |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/application/extraction/clinical-extraction.schema.ts`                        | Skema Zod `clinicalExtractionSchema`, bertipe `z.ZodType<ClinicalExtraction>` supaya selalu sejalan dengan tipe domain              |
| `src/application/extraction/extraction-prompt.ts`                                 | System prompt dan builder user prompt (bagian 3)                                                                                    |
| `src/application/extraction/extract-clinical-evidence.use-case.ts`                | Use case (bagian 4)                                                                                                                 |
| `src/domain/extraction/extraction.repository.ts`                                  | Kontrak repository (abstract class)                                                                                                 |
| `src/domain/extraction/grounded-extraction.ts`                                    | Fungsi murni: buang butir tanpa kutipan valid dan normalkan nama (bagian 5)                                                         |
| `src/infrastructure/database/prisma/repositories/prisma-extraction.repository.ts` | Implementasi Prisma                                                                                                                 |
| `src/infrastructure/database/prisma/repositories/clinical-extraction.parser.ts`   | Ganti parser longgar dengan `clinicalExtractionSchema.safeParse`, mengembalikan `null` jika tidak valid                             |
| `src/extraction.module.ts`                                                        | Module Nest: `PrismaModule`, `LlmModule`, repository, dan use case. Tidak didaftarkan di `AppModule` karena tidak punya controller. |
| `scripts/extract-documents.ts`                                                    | CLI (bagian 6)                                                                                                                      |
| `package.json` (api)                                                              | Script `data:extract`                                                                                                               |
| `docs/contracts/README.md`                                                        | Tambahkan aturan ekstraksi di bagian `clinical_documents.extracted`                                                                 |

Perubahan parser menyentuh file milik Orang A. Isinya hanya memperketat validasi saat membaca, sesuai komentar di `schema.prisma` ("validate on read"), tanpa mengubah tipe keluaran.

### 2. Skema

- `clinicalExtractionSchema` mengikuti `ClinicalExtraction` persis. Field opsional memakai `.nullable()`, bukan `.optional()`, supaya JSON Schema yang dikirim ke LLM eksplisit.
- Tanpa `transform` atau `refine`. Port `LlmClient` meminta skema yang bisa direpresentasikan sebagai JSON (`z.toJSONSchema`).
- Semua array wajib ada; kosong jika tidak ada isinya.

### 3. Prompt

System prompt dalam bahasa Indonesia, dengan aturan:

1. **Ekstrak hanya yang tertulis eksplisit.** Jangan menyimpulkan dan jangan menilai benar-salahnya secara klinis.
2. **`quote` adalah salinan persis** potongan dokumen, tanpa parafrase dan tanpa mengubah ejaan. Ambil kalimat atau frasa terpendek yang masih utuh maknanya.
3. **`name` memakai istilah kanonik** dari `CANONICAL_TERMS` bila maknanya sama atau sinonim eksplisit (sertakan daftar `TERM_SYNONYMS`). Selain itu pakai istilah dari dokumen dalam huruf kecil, tanpa keterangan derajat (derajat cukup ada di `quote`).
4. **Negasi eksplisit dicatat sebagai temuan kanonik dengan `isPresent: false`.** Contoh: "pasien tidak sesak" menjadi `sesak napas` tidak ada; "akral hangat" menjadi `akral dingin` tidak ada (lihat contoh kontrak).
5. **Angka tidak diubah menjadi istilah.** "TD 85/50 mmHg" adalah `vitalSigns` `tekanan darah` dengan value `85/50 mmHg`, bukan temuan `hipotensi`. "RL 20 cc/kgBB" adalah obat `ringer laktat`, bukan tindakan `resusitasi cairan`. Istilah hipotensi, desaturasi, atau resusitasi cairan hanya dicatat jika kata itu tertulis.
6. **Waktu** (`observedAt`, `givenAt`, `performedAt`) diisi ISO 8601 dengan offset `+07:00` hanya jika dokumen menyebut tanggal atau jam yang bisa dipastikan bersama tanggal dokumen. Selain itu `null`.
7. **`icd10Code` diagnosis** hanya diisi dengan kode dari daftar diagnosis klaim yang diberikan di user prompt, jika diagnosis yang disebut dokumen sama. Selain itu `null`. Jangan mengarang kode.
8. Kembalikan array kosong untuk kategori yang tidak ada.

User prompt berisi: tipe dokumen dalam label Indonesia, waktu dokumen (`recordedAt`), daftar diagnosis klaim (`name` dan `icd10Code`), lalu isi dokumen di antara penanda yang jelas.

Instruksi format JSON dan JSON Schema sudah ditambahkan otomatis oleh `OpenAiLlmClient`, jadi jangan diduplikasi di prompt.

### 4. Use case `ExtractClinicalEvidenceUseCase`

```ts
execute(options: { claimNos?: string[]; force: boolean }): Promise<ExtractionRunSummary>
// ExtractionRunSummary = { extractedCount, skippedCount, failed: { documentId, claimNo, reason }[], droppedItemCount }
```

1. Ambil dokumen lewat `ExtractionRepository.findDocumentsToExtract(options)`. Tanpa `force`, hanya dokumen dengan `extracted` null. Setiap dokumen membawa `id`, `claimNo`, `type`, `recordedAt`, `content`, dan diagnosis klaimnya.
2. Proses semua dokumen secara paralel dengan `Promise.allSettled`. Batas paralel sudah diatur `Semaphore` di dalam `OpenAiLlmClient` (`LLM_CONCURRENCY`).
3. Per dokumen: panggil `llm.generateStructured({ system, messages, schema: clinicalExtractionSchema, temperature: 0 })`, lalu jalankan `groundExtraction` (bagian 5) dan simpan lewat `saveExtraction(documentId, extraction)`.
4. Error per dokumen:
   - `LlmUnavailableError`, `LlmRefusedError`, dan `LlmInvalidOutputError` dicatat di `failed` dengan nama class sebagai `reason`, lalu lanjut ke dokumen lain.
   - `LlmConfigurationError` dilempar ulang supaya seluruh run berhenti, karena mengulang tidak akan membantu.
5. Kembalikan ringkasan. Use case tidak menulis log isi dokumen.

### 5. Grounding dan normalisasi (`grounded-extraction.ts`)

Fungsi murni `groundExtraction(extraction, documentContent): { extraction, droppedItemCount }`:

- Normalisasi pembanding: huruf kecil dan spasi beruntun dijadikan satu.
- Buang setiap butir yang `quote`-nya kosong atau bukan substring dari isi dokumen. Pola yang sama sudah dipakai `extractQuotedInDocument` di `scripts/load-contract-fixture.ts`.
- Normalkan `name`: huruf kecil, trim, lalu petakan lewat `TERM_SYNONYMS` jika nama persis ada di peta. Ini jaring pengaman; normalisasi utama tetap di prompt.
- Jangan mengubah `quote`.

### 6. CLI `scripts/extract-documents.ts`

Pola sama dengan `scripts/llm-smoke.ts`, tetapi mengimpor `ExtractionModule` dan `ConfigModule` dengan `envFilePath` ke `apps/api/.env` seperti `scripts/seed-users.ts`.

| Flag                       | Fungsi                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (tanpa flag)               | Ekstrak semua dokumen yang `extracted`-nya masih null                                                                                                                                       |
| `--claim KLM-2026-09-0001` | Batasi ke klaim tertentu, boleh diulang                                                                                                                                                     |
| `--force`                  | Ekstrak ulang walaupun sudah ada hasilnya                                                                                                                                                   |
| `--export`                 | Setelah selesai, tulis `extracted` dari database ke `prisma/seed-data/synthetic-dataset.json`, dicocokkan per `claimNo` + `type` + `recordedAt`. Seed berikutnya tidak perlu memanggil LLM. |

- Cetak ringkasan: jumlah berhasil, dilewati, gagal (beserta daftar `claimNo` dan alasannya), dan butir yang dibuang karena kutipan tidak ditemukan.
- Exit code 1 jika ada `LlmConfigurationError`.

Tambahkan di `apps/api/package.json`: `"data:extract": "tsx scripts/extract-documents.ts"`.

### 7. Verifikasi

1. `npm run lint`, `npm run typecheck`, `npm run build`, dan `npm run format:check` dari root lulus.
2. `npm run data:extract --workspace=@app/api -- --claim <satu klaim UC2_EXAM_MANIPULATION>`. Periksa hasilnya di Prisma Studio: kutipan persis, `sesak napas` muncul dengan `isPresent` true di catatan pemeriksaan dan false di catatan harian.
3. Ulangi untuk satu klaim `UC4_FLAGGED_BUT_VALID`. Pastikan tidak ada temuan `hipotensi` dan tidak ada tindakan `resusitasi cairan`.
4. Jalankan untuk semua dokumen. Menjalankan ulang tanpa `--force` melaporkan semua dokumen dilewati.
5. Login di web, klik **Jalankan analisis** (atau `POST /analysis/run`), lalu cek kriteria penerimaan 7 di Antrean Klaim dan Kartu Klaim.
6. Jalankan `--export`, lalu commit file dataset yang sudah berisi `extracted`.
