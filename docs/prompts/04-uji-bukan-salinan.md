# Prompt 4 — M-06 Uji Bukan Salinan

> Tempel seluruh isi file ini ke sesi agent baru di root repo `integra-app`, dari `main` terbaru yang sudah berisi M-02, M-03, dan M-05.

---

Kamu mengerjakan modul **M-06 Uji Bukan Salinan** untuk INTEGRA, asisten AI untuk verifikator klaim BPJS Kesehatan. Uji ini mengenali rekam medis yang disalin dari pasien lain (modus Cloning, UC-3) dengan mengukur kemiripan teks resume medis dan resep antar klaim, lalu menyorot kalimat yang identik. Uji ini tidak memakai LLM.

Buat branch `feat/m06-similarity-test` dari `main`.

## Aturan kerja

- Baca dulu `AGENTS.md` dan `docs/contracts/README.md` (terutama `findings.citations` dengan `kind: 'IDENTICAL_TEXT'` dan bentuk `relatedClaim`), lalu file berikut di `apps/api/`:
  - `src/domain/analysis/` (seluruh isinya, termasuk `consistency-test.ts` sebagai pola terbaru);
  - `src/application/analysis/` (seluruh isinya);
  - `src/infrastructure/database/prisma/repositories/prisma-analysis.repository.ts`;
  - `src/infrastructure/config/env.schema.ts`;
  - `src/analysis.module.ts`;
  - `prisma/schema.prisma` (unique `@@unique([claimId, relatedClaimId, testType])` di `Finding`).
- `ClaimEvidence` seharusnya sudah memuat `claimNo`, `patientId`, `admittedAt`, serta `type` dan `content` dokumen (dari M-05). Jika belum ada, tambahkan dulu persis seperti bagian 1 di `docs/prompts/03-uji-konsisten.md`.
- Logika kemiripan berupa fungsi murni di `src/domain/analysis/`, tanpa import framework dan **tanpa dependency baru**. TF-IDF dan cosine ditulis sendiri.
- Komentar dan identifier dalam bahasa Inggris. `summary` dalam bahasa Indonesia yang netral, tanpa tuduhan.
- Jangan mengubah bentuk kontrak API. Web sudah menampilkan `similarity`, `relatedClaim`, dan sorotan `IDENTICAL_TEXT`.

---

## PRD

### Tujuan

Mengelompokkan klaim dari pasien berbeda yang resume medis dan resepnya hampir identik, lalu menunjukkan kalimat yang sama persis sebagai bukti.

### User story

Sebagai verifikator, saya ingin melihat klaim lain yang isinya hampir sama beserta kalimat identiknya, supaya saya bisa mengenali pola salinan dan mengeskalasi klusternya ke tim anti-fraud.

### Masuk lingkup

- Kemiripan TF-IDF cosine untuk resume medis dan resep antar pasien berbeda.
- Pasangan disimpan dua arah.
- Ambang batas yang diatur lewat env.
- Sorotan kalimat identik (fitur P1 yang ikut dikerjakan di sini karena murah).
- Script laporan untuk kalibrasi ambang.

### Di luar lingkup

- Deteksi pola teks buatan AI (P2).
- Perubahan UI.

### Kriteria penerimaan

1. Setiap klaim `UC3_CLONING` punya minimal satu finding `SIMILARITY` yang menunjuk klaim kloning lain.
2. Tidak ada klaim di luar `UC3_CLONING` yang mendapat finding `SIMILARITY` dengan ambang default.
3. Klaim dari pasien yang sama tidak pernah dibandingkan.
4. Menjalankan analisis berulang kali tidak menggandakan finding dan tidak melanggar unique constraint.
5. Kartu Klaim klaim kloning menampilkan persentase kemiripan, tautan ke klaim mirip, dan minimal satu kalimat identik yang disorot.
6. Hasil Uji Ada dan Uji Konsisten tidak berubah.

---

## TRD

### 1. Konfigurasi

- Tambahkan di `env.schema.ts`: `SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85)`.
- Tambahkan di `apps/api/.env.example` beserta komentar singkat.
- Use case menerima ambang lewat constructor. Domain tidak membaca env.

### 2. Kemiripan (`src/domain/analysis/similarity-test.ts`)

**Tokenisasi:**

- huruf kecil;
- karakter selain huruf diganti spasi, sehingga angka ikut terbuang (usia, tanggal, dan tanda vital memang berbeda antar pasien);
- buang token kurang dari 3 huruf;
- buang stopword Indonesia dalam daftar konstanta kecil (`yang`, `dan`, `dengan`, `pada`, `untuk`, `dari`, `ini`, `itu`, `atau`, `oleh`, `dalam`, `akan`, `telah`, `sudah`, `pasien`).

**Vektor:**

- TF-IDF dihitung terpisah per tipe dokumen (`MEDICAL_RESUME` dan `PRESCRIPTION`), dengan korpus = klaim yang dianalisis.
- `idf = ln((1 + N) / (1 + df)) + 1`.
- Teks per klaim per tipe = gabungan isi semua dokumen tipe itu.

**Skor pasangan:**

- Cosine resume, dan cosine resep jika kedua klaim punya resep.
- Skor akhir = rata-rata yang tersedia.
- Pasangan tanpa resume di salah satu klaim dilewati.

**Fungsi:**

```ts
export interface SimilarClaimPair {
  claimId: string;
  relatedClaimId: string;
  similarity: number; // 0..1
  documentId: string; // this claim's resume
  relatedDocumentId: string; // related claim's resume
  identicalTexts: {
    documentId: string;
    relatedDocumentId: string;
    text: string;
  }[];
}

/** Every pair of claims from different patients, scored. Unfiltered, for calibration. */
export function scoreClaimPairs(claims: ClaimEvidence[]): SimilarClaimPair[];

/** Pairs at or above the threshold, in both directions. */
export function findSimilarClaimPairs(
  claims: ClaimEvidence[],
  threshold: number,
): SimilarClaimPair[];
```

- `scoreClaimPairs` menghitung setiap pasangan tak berurutan sekali.
- `findSimilarClaimPairs` memfilter berdasarkan ambang, lalu menghasilkan dua arah (A→B dan B→A) dengan `documentId` dan `relatedDocumentId` yang ditukar.

**Kalimat identik:**

- Pecah isi resume dan resep kedua klaim per kalimat (`.`, `!`, `?`, atau baris baru).
- Bandingkan setelah huruf kecil dan penyatuan spasi.
- Ambil kalimat sama minimal 25 karakter, maksimal 3 per pasangan.
- `text` memakai kalimat asli dari klaim pemilik finding; `documentId` adalah dokumen asal kalimat itu di klaim pemilik, `relatedDocumentId` dokumen pasangannya.

### 3. Use case `RunSimilarityTestUseCase`

```ts
constructor(analysisRepository: AnalysisRepository, threshold: number)
execute(claims: ClaimEvidence[]): Promise<void>
```

1. Hitung `findSimilarClaimPairs(claims, threshold)`.
2. Kelompokkan per `claimId`, urutkan dari `similarity` tertinggi, ambil maksimal 5 (`MAX_SIMILAR_CLAIMS_PER_CLAIM`) supaya Kartu Klaim tidak penuh.
3. Petakan ke `NewFinding`:

   | Field                             | Nilai                                                                                       |
   | --------------------------------- | ------------------------------------------------------------------------------------------- |
   | `testType`                        | `'SIMILARITY'`                                                                              |
   | `strength`, `similarity`          | Skor kemiripan, dibulatkan 2 desimal                                                        |
   | `relatedClaimId`                  | Klaim pasangan                                                                              |
   | `documentId`, `relatedDocumentId` | Resume masing-masing                                                                        |
   | `citations`                       | `IDENTICAL_TEXT`                                                                            |
   | `diagnosisId`, `tariffGap`        | `null`                                                                                      |
   | `summary`                         | Contoh: _Resume medis dan resep 94% mirip dengan klaim KLM-2026-09-0031 milik pasien lain._ |

4. Panggil `replaceFindings(claimId, 'SIMILARITY', findings)` untuk **setiap** klaim di input, termasuk yang tidak punya pasangan (array kosong), supaya finding lama terhapus.

Satu baris per `(claimId, relatedClaimId)` menjamin unique constraint aman. Batas 5 per klaim bisa membuat A→B ada tanpa B→A; itu diterima.

### 4. Wiring di `RunAnalysisUseCase`

- Uji ini membandingkan antar klaim, jadi dipanggil **sekali** dengan seluruh `extractedClaims`, sebelum loop per klaim. Dengan begitu `findFindingSignals` di dalam loop sudah melihat finding `SIMILARITY` saat menghitung skor.
- Klaim yang belum diekstraksi tetap dilewati, sama seperti uji lain, supaya `skippedClaimCount` tetap bermakna.
- Daftarkan use case di `analysis.module.ts` dengan `useFactory` yang meng-inject `AnalysisRepository` dan `ConfigService<Env, true>` (`config.get('SIMILARITY_THRESHOLD', { infer: true })`).

### 5. Script kalibrasi `scripts/similarity-report.ts`

- Read-only. Memuat klaim lewat `PrismaAnalysisRepository` (pola `scripts/seed-users.ts`), lalu memanggil `scoreClaimPairs`.
- Menggabungkan dengan `injected_case` dari database, lalu mencetak:
  - 10 pasangan dengan skor tertinggi yang **bukan** keduanya `CLONING`;
  - skor terendah di antara pasangan yang **keduanya** `CLONING`;
  - ambang yang sedang dipakai.
- Ambang yang baik berada di antara dua angka itu. Kalau keduanya tumpang tindih, laporkan ke tim. Jangan memaksakan angka.
- Tambahkan `"eval:similarity": "tsx scripts/similarity-report.ts"` di `apps/api/package.json`.

### 6. Dokumentasi

Di `docs/contracts/README.md`, tambahkan paragraf **Uji Bukan Salinan (M-06) rules** setelah aturan Uji Konsisten. Ringkas tokenisasi, skor, ambang env, penyimpanan dua arah, batas 5 per klaim, dan isi `IDENTICAL_TEXT`.

### 7. Verifikasi

1. `npm run lint`, `npm run typecheck`, `npm run build`, dan `npm run format:check` dari root lulus.
2. `npm run eval:similarity --workspace=@app/api` menunjukkan ambang default memisahkan pasangan kloning dari pasangan lain. Kalau tidak, sesuaikan `SIMILARITY_THRESHOLD` di `.env.example` beserta alasannya di deskripsi PR.
3. `POST /analysis/run` dua kali tanpa error unique constraint, dengan jumlah finding `SIMILARITY` yang sama.
4. Cek kriteria penerimaan 1–3 dan 6 lewat query per skenario. Pemetaan `claimNo` ke skenario ada di `prisma/seed-data/synthetic-dataset.json`.
5. Buka Kartu Klaim satu klaim `UC3_CLONING`: persentase kemiripan, tautan klaim mirip yang bisa diklik, dan kalimat identik yang disorot.
6. Lanjutkan ke **Bagian B** di `docs/prompts/01-data-sintetis.md` (script metrik), lalu jalankan `npm run eval:detection --workspace=@app/api`.
