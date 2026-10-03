export type TourPage = 'queue' | 'claim';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  missingTargetDescription?: string;
  page?: TourPage;
  target?: string;
  /** `copyable` adds a copy button for values the user types, such as demo emails. */
  points?: { label: string; detail: string; copyable?: boolean }[];
  nextLabel?: string;
  advancesOnTargetClick?: boolean;
  showsLogo?: boolean;
}

export const OPEN_FIRST_CLAIM_STEP_ID = 'queue-first-claim';

/** Seven steps from the queue to a decision; detail lives in each step's text. */
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Selamat datang di INTEGRA',
    description:
      'Panduan singkat ini menunjukkan alur verifikasi dari antrean sampai keputusan. INTEGRA menandai klaim yang buktinya kurang, tidak konsisten, atau tersalin. Keputusan tetap di tangan Anda.',
    showsLogo: true,
  },
  {
    id: 'main-nav',
    target: 'main-nav',
    title: 'Menu utama',
    description:
      'Antrean Klaim dan Impor Klaim untuk verifikator. Ikhtisar, Eskalasi, dan Ringkasan Faskes untuk supervisor. Buka panduan ini lagi kapan saja lewat menu Panduan.',
    missingTargetDescription:
      'Buka menu di kiri atas untuk berpindah halaman. Panduan ini bisa dibuka lagi lewat menu Panduan.',
  },
  {
    id: 'run-analysis',
    page: 'queue',
    target: 'run-analysis',
    title: 'Pilih klaim, lalu analisis dengan AI',
    description:
      'Centang beberapa klaim, atau centang kotak di kepala tabel untuk memilih semua klaim di halaman ini, lalu klik Analisis AI. Tombol Analisis di setiap baris menganalisis satu klaim. AI hanya membaca klaim yang Anda pilih, karena setiap dokumen memakai token berbayar.',
    missingTargetDescription:
      'Tombol Analisis AI ada di atas tabel Antrean Klaim. AI hanya membaca klaim yang Anda pilih.',
  },
  {
    id: OPEN_FIRST_CLAIM_STEP_ID,
    page: 'queue',
    target: 'queue-first-claim',
    title: 'Mulai dari klaim teratas',
    description:
      'Klaim diurutkan dari sinyal terkuat dan potensi selisih tarif terbesar. Label perlu klarifikasi bukan tuduhan. Klik baris klaim untuk membuka Kartu Klaim.',
    missingTargetDescription:
      'Antrean masih kosong. Klaim akan muncul setelah data klaim dimuat.',
    nextLabel: 'Buka Kartu Klaim',
    advancesOnTargetClick: true,
  },
  {
    id: 'claim-ai-analysis',
    page: 'claim',
    target: 'claim-ai-analysis',
    title: 'Baca ringkasan INTEGRA AI',
    description:
      'AI membaca rekam medis dan mengekstrak buktinya, lalu aturan klinis menilai. Ringkasan ini menjelaskan temuan dan langkah berikutnya. Potensi selisih tarif di atas kartu menunjukkan dampak finansialnya.',
    missingTargetDescription:
      'Ringkasan AI muncul di Kartu Klaim. Jika klaim belum dianalisis, klik Analisis dengan AI.',
  },
  {
    id: 'claim-test-panels',
    page: 'claim',
    target: 'claim-test-panels',
    title: 'Cek tiga uji dan buktinya',
    description:
      'Setiap panel menjelaskan tanda dari satu uji. Klik sumber kutipan untuk membuka dokumen rekam medis aslinya.',
    points: [
      { label: 'Uji Ada', detail: 'Diagnosis sekunder tanpa bukti klinis.' },
      {
        label: 'Uji Konsisten',
        detail: 'Catatan pemeriksaan yang tidak sejalan dengan catatan lain.',
      },
      {
        label: 'Uji Bukan Salinan',
        detail: 'Dokumen yang hampir identik dengan klaim pasien lain.',
      },
    ],
  },
  {
    id: 'decide',
    page: 'claim',
    target: 'claim-decision-panel',
    title: 'Anda yang memutuskan',
    description:
      'Pilih setujui, minta klarifikasi, atau eskalasi, lalu tulis alasan singkat. Keputusan tercatat atas nama Anda dan status klaim di antrean ikut berubah.',
    nextLabel: 'Mulai meninjau',
  },
];
