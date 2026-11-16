import type { DocumentType } from '../claims/claim-detail';
import { ANOMALY_RMSE_MULTIPLIER } from '../claims/similar-pattern';
import type { ClaimEvidence, SimilarityCandidate } from './claim-evidence';

const SHINGLE_SIZE = 3;
const MIN_IDENTICAL_TEXT_LENGTH = 25;
/** Sentences shared by more claims than this are template boilerplate, not copying. */
const MAX_IDENTICAL_TEXT_CLAIM_RATIO = 0.1;
const MAX_IDENTICAL_TEXTS_PER_MATCH = 3;
const MAX_DIFFERENT_TEXTS_PER_SIDE = 3;
/** Same order as the database enum, so candidates sorted by the repository keep it. */
const DOCUMENT_TYPE_ORDER: readonly DocumentType[] = [
  'MEDICAL_RESUME',
  'EXAM_NOTE',
  'DAILY_NOTE',
  'PRESCRIPTION',
  'PROCEDURE',
];
/** Words and numbers; a decimal number stays one token ("38,9" and "38.9" both become "38.9"). */
const TOKEN_PATTERN = /[\p{L}\p{N}]+(?:\.\p{N}+)*/gu;
const DECIMAL_COMMA_PATTERN = /(\p{N}),(?=\p{N})/gu;
/** Sentence ends at . ! ? followed by whitespace or the end, or at a line break; decimals stay intact. */
const SENTENCE_BOUNDARY_PATTERN = /(?<=[.!?])\s+|\n+/;
const DIAGNOSIS_LINE_PATTERN = /^diagnosis\b|\([A-Z]\d{2}(?:\.\d{1,2})?\)/i;

interface ComparedDocument {
  id: string;
  type: DocumentType;
  content: string;
}

interface ComparedClaim {
  claimId: string;
  claimNo: string;
  patientId: string;
  documents: ComparedDocument[];
}

export interface SimilarClaimMatch {
  relatedClaimId: string;
  relatedClaimNo: string;
  /** TF-IDF cosine similarity, 0..1. */
  similarity: number;
  phraseCount: number;
  sharedPhraseCount: number;
  documentId: string;
  relatedDocumentId: string;
  identicalTexts: {
    documentId: string;
    relatedDocumentId: string;
    text: string;
  }[];
  differentTexts: {
    side: 'CLAIM' | 'RELATED_CLAIM';
    documentId: string;
    text: string;
  }[];
}

interface Sentence {
  documentId: string;
  text: string;
}

function sortByDocumentType(documents: ComparedDocument[]): ComparedDocument[] {
  return documents
    .map((document, index) => ({ document, index }))
    .sort(
      (first, second) =>
        DOCUMENT_TYPE_ORDER.indexOf(first.document.type) -
          DOCUMENT_TYPE_ORDER.indexOf(second.document.type) ||
        first.index - second.index,
    )
    .map(({ document }) => document);
}

function splitComparableSentences(content: string): string[] {
  return content
    .split(SENTENCE_BOUNDARY_PATTERN)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !DIAGNOSIS_LINE_PATTERN.test(sentence));
}

function tokenize(text: string): string[] {
  return (
    text
      .toLowerCase()
      .replace(DECIMAL_COMMA_PATTERN, '$1.')
      .match(TOKEN_PATTERN) ?? []
  );
}

function countShingles(claim: ComparedClaim): Map<string, number> {
  const tokens = tokenize(
    sortByDocumentType(claim.documents)
      .flatMap((document) => splitComparableSentences(document.content))
      .join('\n'),
  );
  const shingleCounts = new Map<string, number>();
  for (let start = 0; start + SHINGLE_SIZE <= tokens.length; start += 1) {
    const shingle = tokens.slice(start, start + SHINGLE_SIZE).join(' ');
    shingleCounts.set(shingle, (shingleCounts.get(shingle) ?? 0) + 1);
  }
  return shingleCounts;
}

function normalizeSentence(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Distinct sentences long enough to be meaningful, keyed by their normalized text. */
function collectSentences(claim: ComparedClaim): Map<string, Sentence> {
  const sentences = new Map<string, Sentence>();
  for (const document of sortByDocumentType(claim.documents)) {
    for (const text of splitComparableSentences(document.content)) {
      if (text.length < MIN_IDENTICAL_TEXT_LENGTH) continue;
      const key = normalizeSentence(text);
      if (!sentences.has(key)) {
        sentences.set(key, { documentId: document.id, text });
      }
    }
  }
  return sentences;
}

function toWeightedVector(
  shingleCounts: Map<string, number>,
  idfByShingle: Map<string, number>,
): { weights: Map<string, number>; norm: number } {
  const weights = new Map<string, number>();
  let squaredNorm = 0;
  for (const [shingle, count] of shingleCounts) {
    const weight = count * (idfByShingle.get(shingle) ?? 0);
    weights.set(shingle, weight);
    squaredNorm += weight * weight;
  }
  return { weights, norm: Math.sqrt(squaredNorm) };
}

function cosine(
  first: ReturnType<typeof toWeightedVector>,
  second: ReturnType<typeof toWeightedVector>,
): number {
  if (first.norm === 0 || second.norm === 0) return 0;
  const [smaller, larger] =
    first.weights.size <= second.weights.size
      ? [first.weights, second.weights]
      : [second.weights, first.weights];
  let dotProduct = 0;
  for (const [shingle, weight] of smaller) {
    dotProduct += weight * (larger.get(shingle) ?? 0);
  }
  return Math.min(dotProduct / (first.norm * second.norm), 1);
}

/** The resume represents a claim; claims without one use their first document. */
function representativeDocumentId(claim: ComparedClaim): string {
  return (
    claim.documents.find((document) => document.type === 'MEDICAL_RESUME')
      ?.id ??
    claim.documents[0]?.id ??
    ''
  );
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toIdfByShingle(
  shingleCountsPerClaim: Map<string, number>[],
): Map<string, number> {
  const documentFrequency = new Map<string, number>();
  for (const shingleCounts of shingleCountsPerClaim) {
    for (const shingle of shingleCounts.keys()) {
      documentFrequency.set(shingle, (documentFrequency.get(shingle) ?? 0) + 1);
    }
  }
  const claimCount = shingleCountsPerClaim.length;
  return new Map(
    [...documentFrequency].map(([shingle, frequency]) => [
      shingle,
      Math.log((1 + claimCount) / (1 + frequency)) + 1,
    ]),
  );
}

function collectMaxSimilarities(group: ComparedClaim[]): number[] {
  const shingleCountsPerClaim = group.map(countShingles);
  const idfByShingle = toIdfByShingle(shingleCountsPerClaim);
  const vectors = shingleCountsPerClaim.map((shingleCounts) =>
    toWeightedVector(shingleCounts, idfByShingle),
  );
  const maxSimilarities: (number | null)[] = group.map(() => null);
  for (let first = 0; first < group.length; first += 1) {
    for (let second = first + 1; second < group.length; second += 1) {
      if (group[first].patientId === group[second].patientId) continue;
      const similarity = cosine(vectors[first], vectors[second]);
      maxSimilarities[first] = Math.max(
        maxSimilarities[first] ?? 0,
        similarity,
      );
      maxSimilarities[second] = Math.max(
        maxSimilarities[second] ?? 0,
        similarity,
      );
    }
  }
  return maxSimilarities.filter((similarity) => similarity !== null);
}

// Prakosa dan Rokhman (2021), IJCCS 15(4): data klaim BPJS anomali bila residual > 2 x RMSE, di sini atas kemiripan tertinggi semua klaim.
export function findSimilarityAnomalyThreshold(
  groups: SimilarityCandidate[][],
): { meanMaxSimilarity: number; anomalyThreshold: number } | null {
  const maxSimilarities = groups.flatMap(collectMaxSimilarities);
  if (maxSimilarities.length === 0) return null;
  const meanMaxSimilarity = average(maxSimilarities);
  const rootMeanSquareError = Math.sqrt(
    average(
      maxSimilarities.map(
        (similarity) => (similarity - meanMaxSimilarity) ** 2,
      ),
    ),
  );
  return {
    meanMaxSimilarity,
    anomalyThreshold:
      meanMaxSimilarity + ANOMALY_RMSE_MULTIPLIER * rootMeanSquareError,
  };
}

/** Candidates from the same patient are never compared. */
export function scoreSimilarClaims(
  claim: ClaimEvidence,
  candidates: SimilarityCandidate[],
): SimilarClaimMatch[] {
  const comparedCandidates = candidates.filter(
    (candidate) =>
      candidate.claimId !== claim.claimId &&
      candidate.patientId !== claim.patientId,
  );
  const corpus: ComparedClaim[] = [claim, ...comparedCandidates];
  const shingleCountsPerClaim = corpus.map(countShingles);
  const sentencesPerClaim = corpus.map(collectSentences);

  const claimCount = corpus.length;
  const idfByShingle = toIdfByShingle(shingleCountsPerClaim);

  const sentenceClaimCount = new Map<string, number>();
  for (const sentences of sentencesPerClaim) {
    for (const key of sentences.keys()) {
      sentenceClaimCount.set(key, (sentenceClaimCount.get(key) ?? 0) + 1);
    }
  }
  // A copied sentence is shared by at least the pair itself, even in a tiny corpus.
  const maxSentenceClaimCount = Math.max(
    2,
    Math.floor(claimCount * MAX_IDENTICAL_TEXT_CLAIM_RATIO),
  );

  const claimShingles = [...shingleCountsPerClaim[0].keys()];
  const vectors = shingleCountsPerClaim.map((shingleCounts) =>
    toWeightedVector(shingleCounts, idfByShingle),
  );
  const claimVector = vectors[0];
  const claimSentences = sentencesPerClaim[0];
  const claimDocumentId = representativeDocumentId(claim);

  return comparedCandidates.map((candidate, index) => {
    const candidateSentences = sentencesPerClaim[index + 1];
    const candidateShingleCounts = shingleCountsPerClaim[index + 1];
    const identicalTexts = [...claimSentences]
      .filter(
        ([key]) =>
          candidateSentences.has(key) &&
          (sentenceClaimCount.get(key) ?? 0) <= maxSentenceClaimCount,
      )
      .slice(0, MAX_IDENTICAL_TEXTS_PER_MATCH)
      .map(([key, sentence]) => ({
        documentId: sentence.documentId,
        relatedDocumentId: candidateSentences.get(key)!.documentId,
        text: sentence.text,
      }));
    const sentencesMissingFrom = (
      side: 'CLAIM' | 'RELATED_CLAIM',
      sentences: Map<string, Sentence>,
      otherSentences: Map<string, Sentence>,
    ) =>
      [...sentences]
        .filter(([key]) => !otherSentences.has(key))
        .slice(0, MAX_DIFFERENT_TEXTS_PER_SIDE)
        .map(([, sentence]) => ({ side, ...sentence }));
    const differentTexts = [
      ...sentencesMissingFrom('CLAIM', claimSentences, candidateSentences),
      ...sentencesMissingFrom(
        'RELATED_CLAIM',
        candidateSentences,
        claimSentences,
      ),
    ];
    return {
      relatedClaimId: candidate.claimId,
      relatedClaimNo: candidate.claimNo,
      similarity: cosine(claimVector, vectors[index + 1]),
      phraseCount: claimShingles.length,
      sharedPhraseCount: claimShingles.filter((shingle) =>
        candidateShingleCounts.has(shingle),
      ).length,
      documentId: claimDocumentId,
      relatedDocumentId: representativeDocumentId(candidate),
      identicalTexts,
      differentTexts,
    };
  });
}
