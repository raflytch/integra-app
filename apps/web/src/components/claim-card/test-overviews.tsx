import Link from 'next/link';
import type { ReactNode } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import {
  ClaimStatusPill,
  EvidenceStatusPill,
  Pill,
} from '@/components/claim-pills';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CARE_TYPE_LABELS } from '@/lib/claim-labels';
import { formatDate, formatLengthOfStay, formatPercent } from '@/lib/format';
import type { ClaimDetail } from '@/types/claim.types';

interface ParameterRow {
  name: string;
  result: ReactNode;
  basis: string[];
}

const SIMILARITY_EXPLANATIONS = [
  'Teks rekam medis dipotong per 3 kata; baris diagnosis tidak dihitung.',
  'Frasa yang jarang muncul di klaim lain berbobot lebih besar (TF-IDF).',
  '90%: hampir semua frasa sama, termasuk keluhan dan angka tanda vital. Biasanya disalin.',
  '30–50%: hanya frasa umum penyakit yang sama. Wajar.',
  'Ambang = rata-rata + 2×RMSE kemiripan tertinggi semua klaim. Menurut aturan 68–95–99,7, hanya sekitar 2,5% teratas yang lewat.',
  'Rujukan: Prakosa & Rokhman (2021), IJCCS 15(4) hlm. 391–402, DOI 10.22146/ijccs.68160, yang menandai 4,35% klaim BPJS sebagai anomali.',
  'Hasilnya dugaan untuk ditelusuri, bukan vonis (Permenkes 16/2019).',
];

const CONSISTENCY_RULES = [
  'Temuan dibantah catatan harian dalam 24 jam',
  'Tertulis demam, suhu ≤ 37,5 °C',
  'Sesak tanpa oksigen, atau akral dingin tanpa cairan',
  'Furosemid pada diare, muntah, syok, atau hipotensi',
  'Waktu catatan di luar masa rawat',
  'Kode ICD-10 tertulis di catatan dokter',
  'Kode .9 di samping kode spesifik yang sama',
];

function BasisList({ basis }: { basis: string[] }) {
  return (
    <span className="flex flex-col text-caption text-ink-secondary">
      {basis.map((source) => (
        <span key={source}>{source}</span>
      ))}
    </span>
  );
}

function Overview({
  checks,
  data,
  rows,
  children,
}: {
  checks: string;
  data: string;
  rows: ParameterRow[];
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 text-caption text-ink-secondary">
        <p>
          <span className="font-medium text-ink">Yang dicek: </span>
          {checks}
        </p>
        <p>
          <span className="font-medium text-ink">Data: </span>
          {data}
        </p>
      </div>
      <dl className="divide-y divide-hairline rounded-lg border border-hairline">
        {rows.map((row) => (
          <div
            key={row.name}
            className="grid gap-1.5 px-4 py-3 md:grid-cols-[9rem_minmax(0,1fr)_13rem] md:gap-4"
          >
            <dt className="text-small font-semibold text-ink">{row.name}</dt>
            <dd className="text-small text-ink">{row.result}</dd>
            <dd>
              <BasisList basis={row.basis} />
            </dd>
          </div>
        ))}
      </dl>
      {children}
    </div>
  );
}

const isMeasured = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function findSimilarityCoverage(claim: ClaimDetail): {
  comparedClaimCount: number;
  mean: number;
  threshold: number;
  max: number;
} | null {
  const {
    comparedClaimCount,
    similarityMean,
    similarityThreshold,
    maxSimilarity,
  } = claim;
  return isMeasured(comparedClaimCount) &&
    isMeasured(similarityMean) &&
    isMeasured(similarityThreshold) &&
    isMeasured(maxSimilarity)
    ? {
        comparedClaimCount,
        mean: similarityMean,
        threshold: similarityThreshold,
        max: maxSimilarity,
      }
    : null;
}

function primaryDiagnosisLabel(claim: ClaimDetail): string {
  const primaryDiagnosis = claim.diagnoses.find(
    (diagnosis) => diagnosis.isPrimary,
  );
  return primaryDiagnosis
    ? `${primaryDiagnosis.name} (${primaryDiagnosis.icd10Code})`
    : claim.inacbgCode;
}

const PNPK_SOURCES: {
  icd10Prefix: string;
  limit: string;
  basis: string[];
}[] = [
  {
    icd10Prefix: 'R57',
    limit: 'Tanda syok: TD sistolik ≤ 90 atau tekanan nadi ≤ 20 mmHg.',
    basis: ['PNPK Infeksi Dengue Dewasa (KMK HK.01.07/MENKES/9845/2020)'],
  },
  {
    icd10Prefix: 'J96',
    limit: 'Desaturasi: SpO2 < 90%.',
    basis: [
      'PNPK Pneumonia Dewasa (KMK HK.01.07/MENKES/1168/2025)',
      'PNPK Anestesiologi dan Terapi Intensif (KMK HK.01.07/MENKES/1541/2022)',
    ],
  },
  {
    icd10Prefix: 'M54',
    limit: 'Skala nyeri NRS, VAS, atau VRS tercatat.',
    basis: ['PNPK Tata Laksana Nyeri (KMK HK.01.07/MENKES/481/2019)'],
  },
  {
    icd10Prefix: 'A01',
    limit:
      'Demam dengan gangguan saluran cerna, dikonfirmasi kultur atau serologi.',
    basis: ['PNPK Demam Tifoid Dewasa (KMK HK.01.07/MENKES/875/2026)'],
  },
  {
    icd10Prefix: 'I11',
    limit: 'Hipertensi: TD ≥ 140/90 mmHg.',
    basis: [
      'PNPK Hipertensi Dewasa (KMK HK.01.07/MENKES/303/2026)',
      'PNPK Gagal Jantung (KMK HK.01.07/MENKES/4801/2021)',
    ],
  },
];

export function ExistenceOverview({ claim }: { claim: ClaimDetail }) {
  const { verification } = claim;
  if (!verification) return null;
  const secondaryDiagnoses = claim.diagnoses.filter(
    (diagnosis) => !diagnosis.isPrimary,
  );
  const sources = PNPK_SOURCES.filter((source) =>
    secondaryDiagnoses.some(
      (diagnosis) =>
        diagnosis.evidenceStatus &&
        diagnosis.icd10Code.startsWith(source.icd10Prefix),
    ),
  );
  const rows: ParameterRow[] = [
    {
      name: 'Status diagnosis',
      result:
        secondaryDiagnoses.length === 0 ? (
          'Tidak ada diagnosis sekunder.'
        ) : (
          <ul className="flex flex-col gap-1.5">
            {secondaryDiagnoses.map((diagnosis) => (
              <li
                key={diagnosis.id}
                className="flex flex-wrap items-center gap-2"
              >
                <span>
                  {diagnosis.name}{' '}
                  <span className="font-mono text-caption text-ink-secondary">
                    {diagnosis.icd10Code}
                  </span>
                </span>
                {diagnosis.evidenceStatus ? (
                  <EvidenceStatusPill status={diagnosis.evidenceStatus} />
                ) : (
                  <Pill tone="outline">Belum ada aturan PNPK</Pill>
                )}
              </li>
            ))}
          </ul>
        ),
      basis: [
        'Permenkes 26/2021 (Pedoman INA-CBG)',
        ...sources.flatMap((source) => source.basis),
      ],
    },
  ];
  if (sources.length > 0) {
    rows.push(
      {
        name: 'Batas klinis',
        result: sources.map((source) => source.limit).join(' '),
        basis: sources.flatMap((source) => source.basis),
      },
      {
        name: 'Selisih tarif',
        result:
          'Hanya untuk diagnosis yang buktinya tidak ditemukan. Nilainya di ringkasan klaim.',
        basis: ['Permenkes 3/2023, sesuai tipe RS dan regional'],
      },
    );
  }

  return (
    <Overview
      checks="Bukti klinis tiap diagnosis sekunder: Didukung, Sebagian, Tidak ditemukan, atau Dibantah data."
      data={
        verification.unassessedDiagnoses.length > 0 &&
        verification.requiredEvidenceCount === 0
          ? 'Belum bisa dinilai: diagnosis sekunder klaim ini belum punya aturan PNPK.'
          : `${verification.foundEvidenceCount} dari ${verification.requiredEvidenceCount} bukti wajib ditemukan di ${claim.documents.length} dokumen.`
      }
      rows={rows}
    />
  );
}

export function ConsistencyOverview({ claim }: { claim: ClaimDetail }) {
  if (!claim.verification) return null;
  const stay =
    claim.lengthOfStayDays === null
      ? `${CARE_TYPE_LABELS[claim.careType]} ${formatDate(claim.admittedAt)}, satu episode tanpa LOS`
      : `${CARE_TYPE_LABELS[claim.careType]} ${formatDate(claim.admittedAt)} sampai ${formatDate(claim.dischargedAt)}, LOS ${formatLengthOfStay(claim.lengthOfStayDays)}`;

  return (
    <Overview
      checks="Isi dokumen dicocokkan satu sama lain dan dengan data RS. Tanpa RMSE: aturan langsung menandai bila terpenuhi."
      data={`${claim.documents.length} dokumen vs data RS (${stay}, INA-CBG ${claim.inacbgCode}).`}
      rows={[
        {
          name: 'Aturan yang dicek',
          result: (
            <ul className="flex list-disc flex-col gap-1 pl-4">
              {CONSISTENCY_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          ),
          basis: ['Aturan tim INTEGRA, tidak diatur regulasi'],
        },
        {
          name: 'Jenis rawat & LOS',
          result: 'Waktu catatan dan tindakan harus di dalam masa rawat.',
          basis: ['Juknis SIRS Rev. 6.3 (Kemenkes, 2025)', 'Permenkes 26/2021'],
        },
      ]}
    />
  );
}

export function SimilarityOverview({ claim }: { claim: ClaimDetail }) {
  if (!claim.verification) return null;
  const { similarPattern } = claim;
  const diagnosisLabel = primaryDiagnosisLabel(claim);
  const coverage = findSimilarityCoverage(claim);
  const procedureCodes =
    claim.procedures.length > 0
      ? `tindakan ${claim.procedures.map((procedure) => procedure.icd9cmCode).join(' + ')}`
      : 'tanpa kode tindakan';

  return (
    <Overview
      checks="Narasi klinis dibandingkan dengan klaim pasien lain berdiagnosis sama. Ambang dihitung dari semua klaim, jadi makin banyak data makin akurat."
      data={
        coverage
          ? `${coverage.comparedClaimCount} klaim ${diagnosisLabel} lain dari pasien berbeda.`
          : 'Belum dihitung.'
      }
      rows={[
        {
          name: 'Kemiripan dokumen',
          result: coverage ? (
            <div className="flex flex-col gap-1">
              <p>
                Paling mirip {formatPercent(coverage.max)}.{' '}
                {coverage.max > coverage.threshold
                  ? 'Di atas ambang: dugaan salinan.'
                  : 'Di bawah ambang: wajar.'}
              </p>
              <p>
                Ambang {formatPercent(coverage.threshold)} = rata-rata{' '}
                {formatPercent(coverage.mean)} + 2 × RMSE{' '}
                {formatPercent((coverage.threshold - coverage.mean) / 2)}.
              </p>
              <p className="text-caption text-ink-secondary">
                Rata-rata dari kemiripan tertinggi tiap klaim di database dengan
                klaim pasien lain berdiagnosis sama. RMSE = seberapa jauh angka
                itu biasanya dari rata-ratanya.
              </p>
            </div>
          ) : (
            'Belum dihitung.'
          ),
          basis: [
            'Prakosa & Rokhman (2021), IJCCS 15(4), DOI 10.22146/ijccs.68160',
            'Cloning: Permenkes 16/2019',
          ],
        },
        {
          name: 'Pola mirip antar-klaim',
          result: similarPattern ? (
            <div className="flex flex-col gap-2">
              <p>
                Diagnosis sekunder di{' '}
                {formatPercent(similarPattern.facilityRate)} klaim faskes ini.
                Ambang {formatPercent(similarPattern.anomalyThreshold)} =
                rata-rata {formatPercent(similarPattern.meanRate)} + 2 × RMSE.
                Untuk penelusuran, tidak mengubah keputusan.
              </p>
              <p className="text-caption text-ink-secondary">
                Rata-rata dari persentase klaim berdiagnosis sekunder di{' '}
                {similarPattern.comparedFacilityCount} faskes untuk diagnosis
                utama ini.
              </p>
              {similarPattern.claims.length > 0 && (
                <>
                  <p className="text-caption text-ink-secondary">
                    SEP lain dengan diagnosis dan {procedureCodes} sama:
                  </p>
                  <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline">
                    {similarPattern.claims.map((similarClaim) => (
                      <li
                        key={similarClaim.id}
                        className="flex flex-wrap items-center gap-2 px-3 py-2"
                      >
                        <Link
                          href={`/claims/${similarClaim.id}`}
                          className="font-mono text-caption break-all text-primary-hover hover:underline"
                        >
                          {similarClaim.claimNo}
                        </Link>
                        <span className="text-caption text-ink-secondary tabular-nums">
                          Masuk {formatDate(similarClaim.admittedAt)}
                        </span>
                        <ClaimStatusPill status={similarClaim.status} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            'Di bawah ambang: rata-rata persentase diagnosis sekunder semua faskes + 2 × RMSE.'
          ),
          basis: [
            'Permenkes 26/2021: diagnosis sekunder menaikkan severity dan tarif INA-CBG',
            'Permenkes 16/2019',
            'Prakosa & Rokhman (2021), IJCCS 15(4), DOI 10.22146/ijccs.68160',
          ],
        },
      ]}
    >
      <Collapsible>
        <CollapsibleTrigger className="group flex items-center gap-1 text-small font-medium text-primary-hover hover:underline">
          Cara persentase kemiripan dihitung
          <LuChevronDown
            className="size-4 transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-small text-ink">
            {SIMILARITY_EXPLANATIONS.map((explanation) => (
              <li key={explanation}>{explanation}</li>
            ))}
          </ol>
        </CollapsibleContent>
      </Collapsible>
    </Overview>
  );
}
