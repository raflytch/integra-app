# Prompt PRD + TRD — task Orang B

Empat prompt siap pakai untuk AI coding agent (Claude Code atau sejenisnya). Setiap file berisi PRD dan TRD lengkap dan bisa dipakai di sesi baru tanpa konteks percakapan sebelumnya.

| Urutan | File                                               | Modul                  | Hari | Bergantung pada                              |
| ------ | -------------------------------------------------- | ---------------------- | ---- | -------------------------------------------- |
| 1      | [01-data-sintetis.md](01-data-sintetis.md)         | M-02 Data Sintetis     | 1    | Foundation (sudah di `main`)                 |
| 2      | [02-ekstraksi-llm.md](02-ekstraksi-llm.md)         | M-03 Ekstraksi LLM     | 1    | Prompt 1 (butuh dokumen di database)         |
| 3      | [03-uji-konsisten.md](03-uji-konsisten.md)         | M-05 Uji Konsisten     | 2    | Prompt 2 (butuh `extracted`)                 |
| 4      | [04-uji-bukan-salinan.md](04-uji-bukan-salinan.md) | M-06 Uji Bukan Salinan | 2    | Prompt 3 (memakai perluasan `ClaimEvidence`) |

Script metrik presisi/recall (bagian dari M-02) ada di akhir prompt 1 sebagai **Bagian B**. Kerjakan setelah prompt 4 selesai.

## Cara pakai

1. Mulai dari `main` terbaru: `git checkout main && git pull`.
2. Buka sesi agent baru di root repo, lalu tempel seluruh isi satu file prompt.
3. Setelah agent selesai, review diff, jalankan perintah di bagian **Verifikasi** prompt itu, lalu buat PR ke `main`.
4. Lanjut ke prompt berikutnya dari `main` yang sudah berisi PR sebelumnya.

## Koordinasi dengan Orang A

Prompt 1, 3, dan 4 menyentuh file yang dibuat Orang A. Beri tahu sebelum mulai supaya tidak bentrok:

| File                                                                            | Diubah oleh    | Perubahan                                                        |
| ------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------- |
| `src/infrastructure/tariffs/synthetic-tariff-schedule.ts`                       | Prompt 1       | Tambah tarif sintetis grup pneumonia dan gastroenteritis         |
| `src/domain/analysis/claim-evidence.ts`                                         | Prompt 3       | Tambah field yang dibutuhkan Uji Konsisten dan Uji Bukan Salinan |
| `src/infrastructure/database/prisma/repositories/prisma-analysis.repository.ts` | Prompt 3       | Select field tambahan                                            |
| `src/application/analysis/run-analysis.use-case.ts`                             | Prompt 3 dan 4 | Panggil dua uji baru                                             |
| `src/analysis.module.ts`                                                        | Prompt 3 dan 4 | Daftarkan use case baru                                          |
| `src/infrastructure/config/env.schema.ts`, `.env.example`                       | Prompt 4       | `SIMILARITY_THRESHOLD`                                           |
| `docs/contracts/README.md`                                                      | Prompt 2, 3, 4 | Dokumentasikan aturan ekstraksi dan dua uji                      |

Perluasan `ClaimEvidence` di prompt 3 hanya **menambah** field, jadi kode Uji Ada milik Orang A tetap jalan tanpa diubah.

## Kontrak bersama antar prompt

Tiga hal ini harus konsisten di semua prompt. Kalau salah satu diubah, ubah juga di prompt lain:

- **Kosakata klinis kanonik** (`src/domain/analysis/clinical-vocabulary.ts`, dibuat di prompt 1). Data sintetis menulis istilah ini, ekstraksi menormalkan sinonim eksplisit ke istilah ini, dan Uji Ada maupun Uji Konsisten mencocokkan istilah ini.
- **Bentuk `clinical_documents.extracted`** di `docs/contracts/clinical-extraction.example.json`.
- **Pemetaan uji ke modus** untuk metrik: `EXISTENCE` → `UPCODING`, `CONSISTENCY` → `EXAM_MANIPULATION`, `SIMILARITY` → `CLONING`.
