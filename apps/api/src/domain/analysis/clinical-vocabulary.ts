/**
 * Shared clinical vocabulary. Synthetic data writes these terms, M-03
 * extraction normalizes explicit synonyms to them, and the detectors match
 * them. Removing a term breaks `evidence_rules` and Uji Konsisten.
 */
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
