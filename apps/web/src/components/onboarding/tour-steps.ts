export type TourPage = 'queue' | 'claim';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  missingTargetDescription?: string;
  page?: TourPage;
  target?: string;
  points?: { label: string; detail: string }[];
  nextLabel?: string;
  advancesOnTargetClick?: boolean;
  showsLogo?: boolean;
}

export const OPEN_FIRST_CLAIM_STEP_ID = 'queue-first-claim';

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Selamat datang di INTEGRA',
    description:
      'Panduan ini menunjukkan alur verifikasi dari antrean sampai bukti klaim. INTEGRA menandai klaim yang buktinya kurang, tidak konsisten, atau tersalin. Keputusan tetap di tangan Anda.',
    showsLogo: true,
  },
  {
    id: 'sidebar-menu',
    target: 'sidebar-menu',
    title: 'Menu utama',
    description:
      'Antrean Klaim untuk verifikator. Eskalasi dan Ringkasan Faskes untuk supervisor yang menindaklanjuti klaim dan memantau pola per faskes.',
  },
  {
    id: 'run-analysis',
    page: 'queue',
    target: 'run-analysis',
    title: 'Jalankan analisis',
    description:
      'Tombol ini menjalankan uji atas bukti klinis yang sudah diekstraksi AI, lalu menghitung ulang potensi selisih tarif dan urutan antrean.',
    missingTargetDescription:
      'Tombol Jalankan analisis ada di halaman Antrean Klaim. Tombol ini menjalankan uji atas bukti yang sudah diekstraksi AI, lalu menghitung ulang urutan antrean.',
  },
  {
    id: 'queue-filter',
    page: 'queue',
    target: 'queue-filter',
    title: 'Pilih antrean',
    description:
      'Menunggu keputusan menampilkan klaim yang belum Anda putuskan. Pilih Semua untuk melihat klaim yang sudah diputuskan.',
  },
  {
    id: OPEN_FIRST_CLAIM_STEP_ID,
    page: 'queue',
    target: 'queue-first-claim',
    title: 'Mulai dari klaim teratas',
    description:
      'Klaim diurutkan dari sinyal terkuat dan potensi selisih tarif terbesar. Label perlu klarifikasi bukan tuduhan. Klik baris klaim untuk membuka Kartu Klaim.',
    missingTargetDescription:
      'Antrean masih kosong. Klaim akan muncul setelah data klaim dimuat dan analisis dijalankan.',
    nextLabel: 'Buka Kartu Klaim',
    advancesOnTargetClick: true,
  },
  {
    id: 'claim-potential-gap',
    page: 'claim',
    target: 'claim-potential-gap',
    title: 'Lihat potensi selisih tarif',
    description:
      'Selisih tarif dalam rupiah jika diagnosis tanpa bukti dikeluarkan dari klaim. Ini dampak finansial dari koreksi.',
  },
  {
    id: 'claim-ai-analysis',
    page: 'claim',
    target: 'claim-ai-analysis',
    title: 'Baca analisis INTEGRA AI',
    description:
      'AI membaca seluruh rekam medis dan mengekstrak buktinya, lalu aturan klinis menilai. Ringkasan ini menjelaskan temuan dan saran langkah berikutnya dalam satu paragraf.',
  },
  {
    id: 'claim-test-panels',
    page: 'claim',
    target: 'claim-test-panels',
    title: 'Baca tiga uji',
    description:
      'Setiap panel menjelaskan tanda dari satu uji beserta buktinya.',
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
    id: 'claim-citation-source',
    page: 'claim',
    target: 'claim-citation-source',
    title: 'Buka bukti aslinya',
    description:
      'Klik sumber kutipan untuk membuka dokumen rekam medis yang dikutip. Anda tidak perlu membaca rekam medis dari nol.',
    missingTargetDescription:
      'Sumber kutipan muncul di panel uji setelah analisis menemukan tanda. Klik sumber itu untuk membuka dokumen rekam medis yang dikutip. Jalankan analisis dari Antrean Klaim jika klaim ini belum dianalisis.',
  },
  {
    id: 'claim-diagnoses',
    page: 'claim',
    target: 'claim-diagnoses',
    title: 'Cek diagnosis yang ditandai',
    description:
      'Diagnosis yang tidak didukung bukti diberi label Belum ada bukti. Gunakan ini saat meminta klarifikasi yang spesifik ke faskes.',
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
