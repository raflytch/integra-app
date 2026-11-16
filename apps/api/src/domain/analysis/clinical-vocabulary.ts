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

const ENGLISH_TERMS: Readonly<Record<string, string>> = {
  fever: 'demam',
  febrile: 'demam',
  'shortness of breath': 'sesak napas',
  dyspnea: 'sesak napas',
  dyspnoea: 'sesak napas',
  breathless: 'sesak napas',
  'cold extremit': 'akral dingin',
  'cold acral': 'akral dingin',
  'cold peripher': 'akral dingin',
  hypotension: 'hipotensi',
  desaturation: 'desaturasi',
  'oxygen saturation': 'saturasi oksigen',
  'pulse oximetry': 'saturasi oksigen',
  oxygen: 'oksigen',
  'fluid resuscitation': 'resusitasi cairan',
  'fluid bolus': 'resusitasi cairan',
  'lactated ringer': 'ringer laktat',
  'ringer lactate': 'ringer laktat',
  nausea: 'mual',
  vomit: 'muntah',
  'abdominal pain': 'nyeri perut',
  'stomach ache': 'nyeri perut',
  diarrhea: 'diare',
  diarrhoea: 'diare',
  constipation: 'konstipasi',
  'back pain': 'nyeri punggung',
  lumbago: 'nyeri punggung',
  'pain scale': 'skala nyeri',
  'pain score': 'skala nyeri',
  tachycardia: 'takikardi',
  tachypn: 'takipne',
  'weak pulse': 'nadi lemah',
  'capillary refill': 'pengisian kapiler',
  rales: 'ronki',
  crackles: 'ronki',
  rhonchi: 'ronki',
  'pleural effusion': 'efusi pleura',
  jugular: 'vena jugularis',
  'leg edema': 'edema tungkai',
  'leg oedema': 'edema tungkai',
  'leg swelling': 'edema tungkai',
  oedema: 'edema',
  hepatomegaly: 'hepatomegali',
  cardiomegaly: 'kardiomegali',
  'third heart sound': 'suara jantung tiga',
  echocardiograph: 'ekokardiografi',
  'ejection fraction': 'fraksi ejeksi',
  hypertension: 'hipertensi',
  fatigue: 'kelelahan',
  petechia: 'petekie',
  'blood culture': 'kultur',
  'blood pressure': 'tekanan darah',
  temperature: 'suhu',
  'heart rate': 'nadi',
  'pulse rate': 'nadi',
  'respiratory rate': 'laju napas',
  'chest x-ray': 'foto toraks',
  'chest radiograph': 'foto toraks',
};

function normalizeTerm(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function translateEnglishTerm(normalizedName: string): string | null {
  const phrases = Object.keys(ENGLISH_TERMS).filter((phrase) =>
    normalizedName.includes(phrase),
  );
  if (phrases.length === 0) return null;
  return ENGLISH_TERMS[
    phrases.reduce((longest, phrase) =>
      phrase.length > longest.length ? phrase : longest,
    )
  ];
}

export function toCanonicalTerm(name: string): string {
  const normalizedName = normalizeTerm(name);
  return (
    TERM_SYNONYMS[normalizedName] ??
    translateEnglishTerm(normalizedName) ??
    normalizedName
  );
}

/** Maps an extracted finding name to its canonical term for comparison across documents. */
export function toCanonicalFinding(name: string): string {
  const normalizedName = normalizeTerm(name);
  const synonymTerm =
    TERM_SYNONYMS[normalizedName] ?? translateEnglishTerm(normalizedName);
  if (synonymTerm) return synonymTerm;
  const containedTerms = CANONICAL_TERMS.findings.filter((term) =>
    normalizedName.includes(term),
  );
  if (containedTerms.length === 0) return normalizedName;
  return containedTerms.reduce((longest, term) =>
    term.length > longest.length ? term : longest,
  );
}
