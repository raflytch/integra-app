# Prompt 3 — M-05 Uji Konsisten

> Tempel seluruh isi file ini ke sesi agent baru di root repo `integra-app`, dari `main` terbaru yang sudah berisi M-02 dan M-03.

---

Kamu mengerjakan modul **M-05 Uji Konsisten** untuk INTEGRA, asisten AI untuk verifikator klaim BPJS Kesehatan. Uji ini menandai catatan pemeriksaan yang tidak sejalan dengan catatan lain di rekam medis yang sama, **tanpa menilai mana yang benar secara klinis**. Label sistem selalu "perlu klarifikasi", tidak pernah "fraud".

Buat branch `feat/m05-consistency-test` dari `main`.

## Aturan kerja

- Baca dulu `AGENTS.md` dan `docs/contracts/README.md` (terutama `findings.citations` dan aturan Uji Ada), lalu file berikut di `apps/api/src/`:
  - `domain/analysis/` (seluruh isinya);
  - `application/analysis/run-analysis.use-case.ts` dan `application/analysis/run-existence-test.use-case.ts`;
  - `infrastructure/database/prisma/repositories/prisma-analysis.repository.ts`;
  - `analysis.module.ts`.

  Uji Ada (`existence-test.ts` dan `run-existence-test.use-case.ts`) adalah pola acuan. Tiru struktur, penamaan, dan gaya penulisannya.

- Logika uji berupa fungsi murni di `src/domain/analysis/`, tanpa import framework.
- Komentar dan identifier dalam bahasa Inggris. `summary` finding dalam bahasa Indonesia yang netral, tanpa kata "fraud", "palsu", atau tuduhan.
- Jangan menambah dependency baru dan jangan mengubah bentuk kontrak API.
- File di bagian 1 milik Orang A. Perubahan harus **menambah**, bukan mengubah perilaku Uji Ada.

---

## PRD

### Tujuan

Menandai catatan pemeriksaan yang tidak konsisten dengan catatan harian, tindakan, atau urutan waktu di rekam medis yang sama (modus Manipulasi Hasil Pemeriksaan, UC-2).

### User story

Sebagai verifikator, saya ingin melihat catatan pemeriksaan yang tidak sejalan dengan catatan lain, beserta kedua kutipannya berdampingan, supaya saya tahu bagian rekam medis mana yang perlu dikonfirmasi ke faskes.

### Masuk lingkup

Tiga aturan:

- temuan yang dibantah catatan harian;
- temuan berat tanpa tindakan;
- waktu yang tidak masuk akal.

### Di luar lingkup

- Menentukan catatan mana yang benar secara klinis.
- Perubahan UI. Panel Uji Konsisten di Kartu Klaim sudah dibuat generik dan menampilkan `summary`, kekuatan sinyal, serta kutipan.

### Kriteria penerimaan

1. Keenam klaim `UC2_EXAM_MANIPULATION` dan `MULTI_UPCODING_EXAM` mendapat minimal satu finding `CONSISTENCY`.
2. Klaim `NORMAL_*`, `GENUINE_*`, `UC1_UPCODING`, `UC3_CLONING`, dan `UC4_FLAGGED_BUT_VALID` tidak mendapat finding `CONSISTENCY`.
3. Finding kontradiksi menampilkan dua kutipan: dokumen yang dicurigai (`documentId`) dan dokumen pembanding (`relatedDocumentId`).
4. Menjalankan analisis berulang kali tidak menggandakan finding.
5. Hasil Uji Ada sebelum dan sesudah perubahan ini identik.

---

## TRD

### 1. Perluasan `ClaimEvidence` (dikerjakan pertama, commit terpisah)

Uji Konsisten dan Uji Bukan Salinan (prompt 4) butuh data yang belum ada di `ClaimEvidence`. Tambahkan field berikut. Field yang sudah ada tidak diubah.

```ts
export interface ClaimEvidence {
  claimId: string;
  claimNo: string; // new
  patientId: string; // new
  facilityId: string; // new
  admittedAt: Date; // new, date-only column
  dischargedAt: Date; // new, date-only column
  inacbgCode: string;
  severityLevel: number;
  tariffAmount: number;
  diagnoses: {
    id: string;
    icd10Code: string;
    name: string;
    isPrimary: boolean;
  }[];
  documents: {
    id: string;
    type: DocumentType; // new
    recordedAt: Date; // new
    content: string; // new
    extracted: ClinicalExtraction | null;
  }[];
}
```

- Perbarui `select` di `PrismaAnalysisRepository.findClaimsForAnalysis`.
- Pastikan `npm run typecheck` lulus tanpa menyentuh logika Uji Ada.
- Commit ini terpisah dengan pesan yang jelas, supaya Orang A mudah me-review.

### 2. Kosakata: `toCanonicalFinding`

Tambahkan di `src/domain/analysis/clinical-vocabulary.ts`:

```ts
/** Maps an extracted finding name to its canonical term for comparison across documents. */
export function toCanonicalFinding(name: string): string;
```

Langkahnya:

1. Ubah ke huruf kecil, trim, dan satukan spasi beruntun.
2. Jika nama persis ada di `TERM_SYNONYMS`, kembalikan istilah kanoniknya.
3. Jika tidak, cari istilah terpanjang dari `CANONICAL_TERMS.findings` yang terkandung di nama, lalu kembalikan istilah itu.
4. Jika tidak ada yang cocok, kembalikan nama yang sudah dinormalisasi.

### 3. Aturan (`src/domain/analysis/consistency-test.ts`)

Fungsi utama: `findInconsistencies(claim: ClaimEvidence): Inconsistency[]`, diurutkan dari `strength` tertinggi.

**Waktu sebuah butir** = `observedAt` / `givenAt` / `performedAt` jika ada, selain itu `recordedAt` dokumennya.

**Masa rawat** = dari `admittedAt` pukul 00:00 sampai akhir hari `dischargedAt`, waktu `+07:00`. Kolom tanggal disimpan Prisma sebagai UTC tengah malam, jadi bentuk batasnya dari string `YYYY-MM-DD` (`toISOString().slice(0, 10)`) ditambah `T00:00:00+07:00`, jangan dari objek `Date` langsung.

| Kode                     | Aturan                                                                                                                                                                           | `strength` | `documentId`               | `relatedDocumentId` | Kutipan                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| `CONTRADICTED_FINDING`   | Temuan `isPresent: true` di `EXAM_NOTE` atau `MEDICAL_RESUME`, dan `DAILY_NOTE` mencatat temuan kanonik yang sama dengan `isPresent: false`, dengan selisih waktu ≤ 24 jam       | 0.9        | Dokumen pemeriksaan/resume | Catatan harian      | Dua `QUOTE`: temuan lalu bantahannya                                                        |
| `FINDING_WITHOUT_ACTION` | Temuan `isPresent: true` yang ada di `FINDING_REQUIRED_ACTIONS`, tetapi tidak satu pun obat atau tindakan di seluruh dokumen klaim yang namanya memuat salah satu tindakan wajib | 0.7        | Dokumen sebutan pertama    | `null`              | Satu `QUOTE`                                                                                |
| `IMPLAUSIBLE_TIME`       | `recordedAt` dokumen atau waktu butir di luar masa rawat                                                                                                                         | 0.6        | Dokumen itu                | `null`              | Satu `QUOTE`: kutipan butirnya, atau kalimat pertama dokumen untuk pelanggaran `recordedAt` |

```ts
/** Findings that require treatment; matched against medication and procedure names. */
export const FINDING_REQUIRED_ACTIONS: Readonly<
  Record<string, readonly string[]>
> = {
  'sesak napas': ['oksigen'],
  'akral dingin': ['resusitasi cairan', 'ringer laktat'],
};
```

Jangan menambahkan `syok` ke tabel ini. Diagnosis syok tanpa bukti adalah wilayah Uji Ada (UC-1). Kalau ditambahkan, klaim upcoding juga akan tertandai di sini dan merusak metrik.

**Deduplikasi:**

- `CONTRADICTED_FINDING`: satu finding per nama temuan kanonik, ambil pasangan dengan selisih waktu terkecil.
- `FINDING_WITHOUT_ACTION`: satu finding per nama temuan.
- `IMPLAUSIBLE_TIME`: satu finding per dokumen.

**Contoh `summary`:**

- _Catatan pemeriksaan 3 Sep menulis "sesak napas", tetapi catatan harian 4 Sep menulis sebaliknya._
- _Temuan "sesak napas" tercatat, tetapi tidak ada pemberian oksigen di rekam medis._
- _Waktu catatan pemeriksaan (2 Sep) berada di luar masa rawat 3–6 Sep._

Label tipe dokumen dalam bahasa Indonesia dibuat di domain (map kecil), bukan diambil dari `apps/web`.

### 4. Use case `RunConsistencyTestUseCase`

Pola sama dengan `RunExistenceTestUseCase`:

```ts
execute(claim: ClaimEvidence): Promise<void>
```

- Panggil `findInconsistencies`, petakan ke `NewFinding` dengan `testType: 'CONSISTENCY'`:
  - `strength` dibulatkan 2 desimal;
  - `citations` berisi `QUOTE`;
  - `diagnosisId`, `relatedClaimId`, `similarity`, dan `tariffGap` bernilai `null`.
- Simpan dengan `analysisRepository.replaceFindings(claimId, 'CONSISTENCY', findings)`. Array kosong tetap dikirim supaya finding lama terhapus.
- Unique `(claimId, relatedClaimId, testType)` tidak menghalangi banyak finding per klaim, karena `relatedClaimId` null dianggap berbeda oleh PostgreSQL.

### 5. Wiring

- Daftarkan `RunConsistencyTestUseCase` di `analysis.module.ts` dengan pola `useFactory` yang sama.
- Di `RunAnalysisUseCase.execute`, panggil `runConsistencyTest.execute(claim)` tepat setelah Uji Ada di dalam loop per klaim, **sebelum** `findFindingSignals`, supaya skor prioritas ikut menghitung finding baru. Rumus skor tidak diubah.

### 6. Dokumentasi

Di `docs/contracts/README.md`, setelah paragraf aturan Uji Ada, tambahkan paragraf **Uji Konsisten (M-05) rules** yang meringkas ketiga aturan, ambang 24 jam, nilai `strength`, dan isi `documentId` / `relatedDocumentId`.

### 7. Verifikasi

1. `npm run lint`, `npm run typecheck`, `npm run build`, dan `npm run format:check` dari root lulus.
2. Sebelum mengubah wiring, catat jumlah finding `EXISTENCE` per klaim. Setelah perubahan, jalankan analisis lagi dan pastikan jumlahnya sama.
3. `POST /analysis/run` (atau tombol **Jalankan analisis**) dua kali. Jumlah finding `CONSISTENCY` sama di kedua run.
4. Cek kriteria penerimaan 1 dan 2 lewat query per skenario. Pemetaan `claimNo` ke skenario ada di `prisma/seed-data/synthetic-dataset.json`.
5. Buka Kartu Klaim satu klaim `UC2_EXAM_MANIPULATION`. Panel Uji Konsisten harus menampilkan dua kutipan dengan tautan ke dokumennya masing-masing.
6. Jika ada klaim normal yang tertandai, perbaiki aturan atau data sumbernya. Jangan menambah pengecualian khusus per klaim.
