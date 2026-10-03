# Prompt 1 — M-02 Data Sintetis

> Tempel seluruh isi file ini ke sesi agent baru di root repo `integra-app`, dari `main` terbaru.

---

Kamu mengerjakan modul **M-02 Data Sintetis** untuk INTEGRA, asisten AI untuk verifikator klaim BPJS Kesehatan. INTEGRA menandai klaim yang buktinya kurang, tidak konsisten, atau tersalin, lalu verifikator yang memutuskan. MVP berjalan sepenuhnya di atas data sintetis.

Buat branch `feat/m02-synthetic-data` dari `main`.

## Aturan kerja

- Baca dulu `AGENTS.md`, `docs/contracts/README.md`, `apps/api/prisma/schema.prisma`, `apps/api/scripts/load-contract-fixture.ts`, `apps/api/scripts/seed-users.ts`, `apps/api/scripts/llm-smoke.ts`, `apps/api/src/application/ports/llm-client.port.ts`, `apps/api/src/application/ports/llm.errors.ts`, dan `apps/api/src/infrastructure/tariffs/synthetic-tariff-schedule.ts`. Ikuti pola dan gaya kode yang sudah ada.
- Komentar dan identifier dalam bahasa Inggris. Isi dokumen klinis dalam bahasa Indonesia.
- Jangan menambah dependency baru. Yang dibutuhkan (`zod`, `tsx`, `openai` lewat `LlmClient`) sudah terpasang.
- Semua data fiktif: nama pasien `Pasien Sintetis NNNN`, nama faskes karangan, tanpa orang atau rumah sakit nyata.
- Script memanggil LLM hanya lewat port `LlmClient`, tidak pernah lewat SDK `openai` langsung.
- Jangan mengubah bentuk kontrak di `docs/contracts/`.

---

## PRD

### Tujuan

Menyediakan dataset klaim rawat inap sintetis yang realistis, lengkap dengan kunci jawaban (`claims.injected_case`), sehingga demo 3 menit dan metrik presisi/recall bisa diukur secara jujur tanpa data peserta JKN riil.

### User story

Sebagai tim, saya ingin dataset sintetis dengan kasus sisipan yang terkontrol, supaya tiga uji INTEGRA bisa didemokan dan diukur terhadap kunci jawaban.

### Masuk lingkup

- Klaim rawat inap dengan resume medis, catatan pemeriksaan, catatan harian, resep, dan catatan tindakan.
- Kasus sisipan: upcoding (UC-1), manipulasi hasil pemeriksaan (UC-2), cloning (UC-3), dan kasus wajar yang tetap tertandai (UC-4).
- Satu klaim bisa memuat lebih dari satu modus.
- Tabel bukti klinis (`evidence_rules`) untuk dua diagnosis sekunder.
- Tarif sintetis untuk grup INA-CBG yang dipakai.
- Kosakata klinis kanonik yang dipakai bersama oleh data, ekstraksi, dan uji.
- Script metrik presisi/recall (Bagian B).

### Di luar lingkup

- Data riil atau integrasi BPJS.
- Cakupan semua diagnosis dan kelompok INA-CBG.
- Ekstraksi bukti (M-03) dan uji apa pun.

### Kriteria penerimaan

1. Satu perintah membuat file dataset; perintah lain memasukkannya ke database. Seed bisa dijalankan ulang dan hasilnya sama.
2. Setiap klaim sisipan punya `injected_case` yang benar. Klaim wajar, termasuk UC-4, punya array kosong.
3. Skenario UC-1 sampai UC-4 ada di data dan lolos pemeriksaan otomatis di generator (lihat TRD 4).
4. Generator tidak memanggil LLM lagi kalau file dataset sudah ada, kecuali diberi `--force`.
5. Seed tidak menyentuh tabel `users` dan klaim fixture kontrak (`KLM-2026-08-0101`).

---

## TRD

### 1. File yang dibuat atau diubah

| File                                                               | Isi                                                                                                |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `apps/api/src/domain/analysis/clinical-vocabulary.ts`              | Istilah klinis kanonik dan sinonim eksplisit (bagian 2)                                            |
| `apps/api/scripts/synthetic/scenarios.ts`                          | Spesifikasi faskes, diagnosis, skenario, dan aturan pemeriksaan (bagian 3)                         |
| `apps/api/scripts/synthetic/dataset.schema.ts`                     | Skema Zod file dataset, dipakai generator dan seed                                                 |
| `apps/api/scripts/generate-synthetic-dataset.ts`                   | Generator: memanggil LLM, menulis file dataset                                                     |
| `apps/api/scripts/seed-synthetic-dataset.ts`                       | Seed: membaca file dataset, menulis ke database                                                    |
| `apps/api/prisma/seed-data/synthetic-dataset.json`                 | Hasil generator, **di-commit** supaya seluruh tim memakai data yang sama tanpa memanggil LLM ulang |
| `apps/api/src/infrastructure/tariffs/synthetic-tariff-schedule.ts` | Tambah tarif sintetis dua grup baru (bagian 3.2)                                                   |
| `apps/api/package.json`                                            | Script `data:generate`, `data:seed`, `eval:detection`                                              |
| `apps/api/scripts/evaluate-detection.ts`                           | Bagian B                                                                                           |

Script mengikuti pola `scripts/seed-users.ts`: Nest application context, `ConfigModule` dengan `validateEnv`, dan `PrismaService` dibuat dari `ConfigService`. Generator juga mengimpor `LlmModule` seperti `scripts/llm-smoke.ts`.

### 2. Kosakata klinis kanonik (`clinical-vocabulary.ts`)

File domain murni tanpa import framework. Isinya kontrak bersama: data sintetis **menulis** istilah ini, ekstraksi (M-03) **menormalkan sinonim eksplisit** ke istilah ini, dan uji **mencocokkan** istilah ini.

```ts
export const CANONICAL_TERMS = {
  findings: [
    'demam',
    'petekie',
    'akral dingin',
    'sesak napas',
    'ronki',
    'diare',
    'muntah',
    'nyeri perut',
    'syok',
    'gagal napas',
    'hipotensi',
    'desaturasi',
  ],
  vitalSigns: [
    'tekanan darah',
    'nadi',
    'suhu',
    'laju napas',
    'saturasi oksigen',
  ],
  medications: [
    'parasetamol',
    'oksigen',
    'ringer laktat',
    'seftriakson',
    'oralit',
    'zinc',
    'ondansetron',
  ],
  procedures: [
    'resusitasi cairan',
    'pemeriksaan hematokrit serial',
    'foto toraks',
    'nebulisasi',
  ],
} as const;

/** Explicit synonyms only. Never infer a term from numbers (e.g. "TD 85/50" is not "hipotensi"). */
export const TERM_SYNONYMS: Readonly<Record<string, string>> = {
  dispnea: 'sesak napas',
  sesak: 'sesak napas',
  o2: 'oksigen',
  'nasal kanul': 'oksigen',
  rl: 'ringer laktat',
  paracetamol: 'parasetamol',
  ceftriaxone: 'seftriakson',
};
```

Boleh menambah istilah kalau generator membutuhkannya, tetapi jangan menghapus istilah di atas karena dipakai `evidence_rules` dan Uji Konsisten.

Aturan "jangan menyimpulkan dari angka" penting untuk UC-4: tekanan darah `85/50 mmHg` tetap dicatat sebagai tanda vital, bukan sebagai `hipotensi`, sehingga UC-4 tetap tertandai seperti yang diminta PRD.

### 3. Spesifikasi dataset (`scenarios.ts`)

#### 3.1 Faskes dan pasien

- **4 faskes** fiktif dengan tipe A, B, C, D di kota berbeda. Kode `RS-SIM-001` sampai `RS-SIM-004`.
- **1 pasien per klaim.** Nomor rekam medis `RM-SIM-0001` dan seterusnya, nama `Pasien Sintetis 0001`, gender dan tanggal lahir bervariasi (usia 18–70 tahun).
- Nomor klaim `KLM-2026-09-0001` dan seterusnya. Tanggal masuk dalam September 2026, lama rawat 3–5 hari.

#### 3.2 Diagnosis, INA-CBG, dan tarif

| Penyakit              | Diagnosis utama | Diagnosis sekunder (opsional) | Grup INA-CBG                           |
| --------------------- | --------------- | ----------------------------- | -------------------------------------- |
| Demam berdarah dengue | `A91`           | `R57.9` Syok                  | `A-4-14` (sudah ada di tarif sintetis) |
| Pneumonia             | `J18.9`         | `J96.0` Gagal napas akut      | `J-4-16` (tambahkan)                   |
| Gastroenteritis akut  | `A09`           | —                             | `K-4-17` (tambahkan)                   |

- `inacbgCode` = grup + sufiks severity, mengikuti fixture (`A-4-14-III`). `toInacbgGroupCode` di `src/domain/analysis/tariff-gap.ts` memotong sufiks ini.
- `severityLevel`: 3 jika ada diagnosis sekunder, selain itu 1 atau 2.
- `tariffAmount` = tarif sintetis grup itu untuk severity klaim.
- Tambahkan ke `SYNTHETIC_TARIFFS_BY_INACBG_GROUP`: `'J-4-16': { 1: 4_800_000, 2: 6_900_000, 3: 10_400_000 }` dan `'K-4-17': { 1: 2_900_000, 2: 3_800_000, 3: 5_600_000 }`. Beri komentar bahwa angka ini sintetis, bukan tarif resmi.

#### 3.3 Tabel bukti klinis (`evidence_rules`)

| `icd10Code` | `evidenceType` | `expected`          |
| ----------- | -------------- | ------------------- |
| `R57.9`     | `PROCEDURE`    | `resusitasi cairan` |
| `R57.9`     | `FINDING`      | `akral dingin`      |
| `R57.9`     | `VITAL_SIGN`   | `hipotensi`         |
| `J96.0`     | `MEDICATION`   | `oksigen`           |
| `J96.0`     | `FINDING`      | `sesak napas`       |
| `J96.0`     | `VITAL_SIGN`   | `desaturasi`        |

`guidelineRef` berisi nama pedoman tata laksana yang relevan **tanpa nomor halaman karangan**, diakhiri `(perlu diverifikasi tim)`. Baris `R57.9` sudah pernah di-upsert oleh fixture kontrak; seed cukup meng-upsert lewat unique `icd10Code_evidenceType_expected`.

Uji Ada mencocokkan `expected` sebagai substring nama item hasil ekstraksi dengan tipe yang sama. Untuk `VITAL_SIGN`, ia juga mencocokkan temuan yang ada (`isPresent: true`). Karena itu dokumen yang **memang** punya bukti wajib menulis istilah kanoniknya secara eksplisit, misalnya "hipotensi (TD 80/50 mmHg)" atau "desaturasi, SpO2 88%".

#### 3.4 Skenario (total 42 klaim)

| Skenario                | Jumlah | Penyakit dan diagnosis | `injected_case`                     | Ciri wajib di dokumen                                                                                                                                                                                                                                     |
| ----------------------- | ------ | ---------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NORMAL_DBD`            | 5      | A91                    | `[]`                                | Dokumentasi lengkap dan konsisten. Tidak menyebut syok.                                                                                                                                                                                                   |
| `NORMAL_PNEUMONIA`      | 5      | J18.9                  | `[]`                                | Kalau menulis "sesak napas", oksigen wajib diberikan dan catatan harian pertama tidak boleh menulis "tidak sesak".                                                                                                                                        |
| `NORMAL_GE`             | 4      | A09                    | `[]`                                | Dokumentasi lengkap.                                                                                                                                                                                                                                      |
| `GENUINE_SHOCK`         | 2      | A91 + R57.9            | `[]`                                | Menulis "resusitasi cairan", "akral dingin", dan "hipotensi". Tidak boleh tertandai Uji Ada.                                                                                                                                                              |
| `GENUINE_RESP_FAILURE`  | 2      | J18.9 + J96.0          | `[]`                                | Menulis "oksigen", "sesak napas", dan "desaturasi". Tidak boleh tertandai Uji Ada.                                                                                                                                                                        |
| `UC1_UPCODING`          | 4      | A91 + R57.9            | `['UPCODING']`                      | Resume menyebut syok, tetapi **tidak ada** "resusitasi cairan", "akral dingin", atau "hipotensi" di dokumen mana pun. Catatan harian menulis akral hangat dan TD normal.                                                                                  |
| `UC2_EXAM_MANIPULATION` | 4      | J18.9                  | `['EXAM_MANIPULATION']`             | Catatan pemeriksaan menulis "sesak napas berat, ronki basah". Catatan harian pertama menulis "pasien tidak sesak". **Tidak ada** "oksigen" di dokumen mana pun. Satu dari empat klaim memakai waktu catatan pemeriksaan sehari **sebelum** tanggal masuk. |
| `MULTI_UPCODING_EXAM`   | 2      | J18.9 + J96.0          | `['UPCODING', 'EXAM_MANIPULATION']` | Resume menyebut gagal napas. Catatan pemeriksaan menulis "sesak napas". Catatan harian pertama menulis "pasien tidak sesak". **Tidak ada** "oksigen" maupun "desaturasi".                                                                                 |
| `UC3_CLONING`           | 12     | A91                    | `['CLONING']`                       | Semua di faskes tipe C, dalam September 2026, pasien berbeda. Resume dan resep hampir identik (lihat 4.3).                                                                                                                                                |
| `UC4_FLAGGED_BUT_VALID` | 2      | A91 + R57.9            | `[]`                                | Menulis "akral dingin" tetapi bukti lain dalam format tidak kanonik: "TD 85/50 mmHg" (tanpa kata hipotensi) dan "RL 20 cc/kgBB dalam 1 jam" (tanpa kata resusitasi cairan). Akan tertandai Uji Ada, lalu verifikator menyetujuinya.                       |

Faskes untuk skenario selain `UC3_CLONING` dibagi bergiliran ke keempat faskes.

**Perbaikan klinis tidak boleh terlalu cepat.** Untuk `NORMAL_PNEUMONIA`, `GENUINE_SHOCK`, `GENUINE_RESP_FAILURE`, dan `UC4_FLAGGED_BUT_VALID`, catatan harian pertama tidak boleh memuat "tidak sesak" atau "akral hangat". Perbaikan seperti "sesak berkurang" baru boleh ditulis mulai catatan harian kedua.

Alasannya, Uji Konsisten (M-05) menandai temuan di catatan pemeriksaan yang dibantah catatan harian dalam 24 jam. Tanpa aturan ini, klaim wajar ikut tertandai dan metrik menjadi kacau. Masukkan aturan ini ke `mustNotContain` catatan harian pertama.

#### 3.5 Dokumen per klaim

Semua waktu memakai offset `+07:00`.

| Tipe             | Jumlah                       | Waktu                                                                          |
| ---------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| `EXAM_NOTE`      | 1                            | Hari masuk, 09:00 (kecuali kasus waktu janggal di UC-2)                        |
| `PRESCRIPTION`   | 1                            | Hari masuk, 11:00                                                              |
| `PROCEDURE`      | 0–1                          | Hari masuk, 13:00. DBD: pemeriksaan hematokrit serial. Pneumonia: foto toraks. |
| `DAILY_NOTE`     | 1 per hari rawat, maksimal 3 | Mulai hari setelah masuk, 08:00                                                |
| `MEDICAL_RESUME` | 1                            | Hari pulang, 10:00                                                             |

Gaya penulisan: singkat seperti catatan klinis nyata. Resume 80–150 kata; dokumen lain 20–80 kata. Pakai istilah dari `CANONICAL_TERMS` untuk hal yang memang ada.

### 4. Generator (`generate-synthetic-dataset.ts`)

#### 4.1 Alur

1. Kalau `prisma/seed-data/synthetic-dataset.json` sudah ada dan tidak ada flag `--force`, berhenti dengan pesan jelas tanpa memanggil LLM.
2. Bangun faskes, pasien, klaim, diagnosis, dan waktu dokumen secara **deterministik** dari `scenarios.ts` (tanpa LLM, tanpa `Math.random`; pakai indeks atau seed tetap).
3. Untuk setiap klaim kecuali klon UC-3, panggil `llm.generateStructured` **sekali** untuk menulis semua dokumen klaim itu.
4. Buat 12 klaim UC-3 dari satu set dokumen dasar (4.3).
5. Validasi seluruh dataset dengan skema Zod, lalu tulis file JSON (rapi, indent 2).

Total sekitar 31 panggilan LLM.

#### 4.2 Panggilan LLM per klaim

- Skema output: `{ examNote: string, dailyNotes: string[], prescription: string, procedureNote: string | null, medicalResume: string }`. Panjang `dailyNotes` harus sama dengan jumlah catatan harian klaim itu; tolak dan ulangi kalau berbeda.
- `temperature: 0.9` supaya klaim normal bervariasi dan tidak saling mirip.
- System prompt (bahasa Indonesia) berisi: peran penulis rekam medis sintetis, gaya penulisan (3.5), daftar `CANONICAL_TERMS`, larangan memakai nama orang atau rumah sakit nyata, dan larangan menulis kata "fraud", "upcoding", atau "sisipan".
- User prompt berisi ringkasan klinis klaim: usia, gender, diagnosis, lama rawat, jumlah catatan harian, serta daftar **istilah wajib** dan **istilah terlarang** dari skenario.

#### 4.3 Klon UC-3

- Buat satu set dokumen dasar dengan skenario DBD normal.
- Untuk tiap klon, ganti hanya data pasien secara programatik: usia ("NN tahun"), kata ganti gender ("laki-laki"/"perempuan"), dan sedikit variasi angka tanda vital. Kalimat lain dibiarkan identik.
- Resep dan resume harus identik di luar penggantian tersebut, supaya Uji Bukan Salinan bisa mendeteksi dan menyorot kalimat identik.

#### 4.4 Pemeriksaan skenario

Setiap skenario punya aturan `mustContain` dan `mustNotContain` per tipe dokumen (atau "semua dokumen") yang diturunkan dari kolom "Ciri wajib" di 3.4. Pencocokan memakai huruf kecil.

- Kalau output LLM melanggar, ulangi panggilan untuk klaim itu, maksimal 2 kali lagi.
- Kalau masih gagal, hentikan script dengan error yang menyebut nomor klaim dan aturan yang dilanggar. Dataset setengah jadi tidak boleh ditulis.
- Tangani error dari `llm.errors.ts`. `LlmUnavailableError` dan `LlmInvalidOutputError` diperlakukan sama seperti pelanggaran aturan (diulang); `LlmConfigurationError` langsung menghentikan script.

### 5. File dataset (`dataset.schema.ts`)

```ts
{
  version: 1,
  generatedAt: string,           // ISO timestamp
  model: string,                 // from LlmResult.model
  facilities: { code, name, type, city }[],
  patients: { medicalRecordNo, name, gender, birthDate }[],
  evidenceRules: { icd10Code, evidenceType, expected, guidelineRef }[],
  claims: {
    claimNo, scenario, facilityCode, medicalRecordNo,
    admittedAt, dischargedAt,      // YYYY-MM-DD
    inacbgCode, severityLevel, tariffAmount,
    injectedCase: ('UPCODING' | 'EXAM_MANIPULATION' | 'CLONING')[],
    diagnoses: { icd10Code, name, isPrimary }[],
    documents: {
      type, recordedAt, content,   // recordedAt ISO with +07:00
      extracted?: ClinicalExtraction  // filled later by M-03 export, optional
    }[],
  }[],
}
```

Field `extracted` opsional disiapkan untuk M-03: setelah ekstraksi, hasilnya bisa diekspor ke file ini supaya seed berikutnya tidak perlu memanggil LLM lagi.

### 6. Seed (`seed-synthetic-dataset.ts`)

- Baca dan validasi file dataset dengan skema Zod.
- Upsert faskes (kunci `code`), pasien (`medicalRecordNo`), dan `evidence_rules` (`icd10Code_evidenceType_expected`).
- Per klaim, dalam satu transaksi:
  - upsert klaim berdasarkan `claimNo`;
  - reset `status` ke `PENDING`, `potentialGap` dan `priorityScore` ke 0;
  - hapus findings, decisions, diagnosis, dan dokumen klaim itu, lalu buat ulang diagnosis dan dokumen;
  - isi `extracted` jika ada di file.
- Hanya klaim dengan `claimNo` di dataset yang disentuh. `users` dan fixture kontrak tidak boleh berubah.
- Cetak ringkasan: jumlah faskes, pasien, klaim per skenario, dokumen, dan berapa dokumen yang sudah punya `extracted`.

### 7. Script npm (`apps/api/package.json`)

```json
"data:generate": "tsx scripts/generate-synthetic-dataset.ts",
"data:seed": "tsx scripts/seed-synthetic-dataset.ts",
"eval:detection": "tsx scripts/evaluate-detection.ts"
```

Pastikan `lint` (`eslint src scripts`) tetap lulus untuk file di `scripts/synthetic/`.

### 8. Verifikasi

1. `npm run lint`, `npm run typecheck`, `npm run build`, dan `npm run format:check` dari root lulus.
2. `npm run data:generate --workspace=@app/api` membuat file dataset. Menjalankannya lagi tanpa `--force` berhenti tanpa memanggil LLM.
3. `npm run data:seed --workspace=@app/api` dua kali berturut-turut menghasilkan jumlah baris yang sama.
4. Query cepat: 42 klaim, `injected_case` sesuai tabel 3.4, dan setiap klaim punya diagnosis serta dokumen.
5. Buka satu klaim tiap skenario di Prisma Studio, lalu baca dokumennya. Pastikan ceritanya masuk akal dan ciri skenarionya terlihat.

---

## Bagian B — Script metrik (kerjakan setelah prompt 4 selesai)

Buat `apps/api/scripts/evaluate-detection.ts`. Script ini hanya membaca database, tidak menulis.

- **Pemetaan uji ke modus:** `EXISTENCE` → `UPCODING`, `CONSISTENCY` → `EXAM_MANIPULATION`, `SIMILARITY` → `CLONING`.
- **Per uji, di level klaim:**
  - TP = klaim dengan modus terkait yang punya ≥ 1 finding uji itu;
  - FP = punya finding tetapi tidak punya modus itu;
  - FN = punya modus tetapi tidak ada finding.
  - Hitung presisi dan recall, dengan pembagi nol ditampilkan sebagai `-`.
- **Keseluruhan:** klaim dengan modus apa pun dibandingkan dengan klaim yang punya finding apa pun.
- **Estimasi selisih tarif:** total `potential_gap` pada klaim `UPCODING` yang tertandai `EXISTENCE`.
- **Catatan UC-4:** tampilkan terpisah bahwa klaim `UC4_FLAGGED_BUT_VALID` memang dirancang tertandai, sehingga dihitung sebagai FP Uji Ada.
- Cetak tabel ke console dengan judul "Estimasi berbasis data sintetis".
- Kalau belum ada finding sama sekali, cetak pesan untuk menjalankan analisis dulu.

Verifikasi: setelah `data:seed`, ekstraksi (prompt 2), dan `POST /analysis/run`, `npm run eval:detection --workspace=@app/api` mencetak metrik untuk ketiga uji.
