export type TourPage = 'queue';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  missingTargetDescription?: string;
  page?: TourPage;
  target?: string;
  points?: { label: string; detail: string }[];
  nextLabel?: string;
  showsLogo?: boolean;
}

/** Kept short on purpose: four steps on the queue, the page every user starts from. */
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Selamat datang di INTEGRA',
    description:
      'INTEGRA menandai klaim yang buktinya kurang, tidak konsisten, atau tersalin. Keputusan tetap di tangan Anda. Kenali alurnya dalam empat langkah singkat.',
    showsLogo: true,
  },
  {
    id: 'main-nav',
    target: 'main-nav',
    title: 'Menu utama',
    description:
      'Antrean Klaim untuk verifikator. Ikhtisar, Eskalasi, dan Ringkasan Faskes untuk supervisor. Panduan ini bisa dibuka lagi dari menu Panduan.',
    missingTargetDescription:
      'Buka menu di kiri atas untuk berpindah halaman. Panduan ini bisa dibuka lagi dari menu Panduan.',
  },
  {
    id: 'run-analysis',
    page: 'queue',
    target: 'run-analysis',
    title: 'Pilih klaim, lalu analisis dengan AI',
    description:
      'Centang klaim atau gunakan menu Pilih, lalu klik Analisis AI. AI hanya membaca klaim yang Anda pilih. Cari, saring, dan urutkan klaim lewat kolom di atas tabel.',
    missingTargetDescription:
      'Tombol Analisis AI ada di atas tabel Antrean Klaim. AI hanya membaca klaim yang Anda pilih.',
  },
  {
    id: 'queue-first-claim',
    page: 'queue',
    target: 'queue-first-claim',
    title: 'Buka klaim untuk memutuskan',
    description:
      'Klik baris klaim untuk membuka Kartu Klaim. Di sana Anda menemukan:',
    points: [
      {
        label: 'Tiga uji',
        detail: 'Tanda bukti kurang, tidak konsisten, atau tersalin.',
      },
      { label: 'Bukti asli', detail: 'Kutipan yang menautkan rekam medis.' },
      {
        label: 'Keputusan',
        detail: 'Setujui, minta klarifikasi, atau eskalasi dengan alasan.',
      },
    ],
    missingTargetDescription:
      'Antrean masih kosong. Klaim akan muncul di sini setelah data klaim dimuat.',
    nextLabel: 'Mulai meninjau',
  },
];
