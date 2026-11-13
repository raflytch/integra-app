'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LuCircleCheck } from 'react-icons/lu';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { DecisionActionPill, Pill } from '@/components/claim-pills';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  DECISION_ACTION_DETAILS,
  DOCUMENT_TYPE_LABELS,
} from '@/lib/claim-labels';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { recordDecision } from '@/services/claim.service';
import type {
  ClaimDecision,
  ClaimFinding,
  DecisionAction,
  DocumentType,
  EvidenceType,
} from '@/types/claim.types';

export interface DecisionDraft {
  action: DecisionAction | '';
  reason: string;
  missingDocumentTypes: DocumentType[];
}

export const EMPTY_DECISION_DRAFT: DecisionDraft = {
  action: '',
  reason: '',
  missingDocumentTypes: [],
};

const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];
const DOCUMENT_TYPE_BY_EVIDENCE_TYPE: Record<EvidenceType, DocumentType> = {
  MEDICATION: 'PRESCRIPTION',
  PROCEDURE: 'PROCEDURE',
  FINDING: 'EXAM_NOTE',
  VITAL_SIGN: 'EXAM_NOTE',
};

export function suggestMissingDocumentTypes(
  findings: ClaimFinding[],
): DocumentType[] {
  const suggested = new Set<DocumentType>();
  for (const finding of findings) {
    for (const citation of finding.citations) {
      if (citation.kind === 'MISSING_EVIDENCE') {
        suggested.add(DOCUMENT_TYPE_BY_EVIDENCE_TYPE[citation.evidenceType]);
      }
    }
  }
  return DOCUMENT_TYPES.filter((documentType) => suggested.has(documentType));
}
export const DECISION_REASON_INPUT_ID = 'decision-reason';

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 1000;
const DECISION_TONE_CLASS_NAMES: Record<
  DecisionAction,
  { option: string; radio: string }
> = {
  APPROVE: {
    option:
      'has-[[data-state=checked]]:border-success has-[[data-state=checked]]:bg-success/10',
    radio: 'text-success data-[state=checked]:border-success',
  },
  REQUEST_CLARIFICATION: {
    option:
      'has-[[data-state=checked]]:border-warning has-[[data-state=checked]]:bg-warning/10',
    radio: 'text-warning data-[state=checked]:border-warning',
  },
  ESCALATE: {
    option:
      'has-[[data-state=checked]]:border-error has-[[data-state=checked]]:bg-error/10',
    radio: 'text-error data-[state=checked]:border-error',
  },
};

const DECISION_ACTIONS = Object.keys(
  DECISION_ACTION_DETAILS,
) as DecisionAction[];

function DecisionHistory({ decisions }: { decisions: ClaimDecision[] }) {
  if (decisions.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 border-t border-hairline pt-4">
      <h3 className="text-caption text-ink-secondary">Riwayat keputusan</h3>
      <ol className="flex flex-col gap-3">
        {decisions.map((decision) => (
          <li key={decision.id} className="flex flex-col items-start gap-1">
            <DecisionActionPill action={decision.action} />
            <span className="text-small text-ink-secondary">
              {decision.reason}
            </span>
            {decision.missingDocuments.length > 0 && (
              <span className="text-caption text-ink-secondary">
                Dokumen kurang:{' '}
                {decision.missingDocuments
                  .map(
                    (missingDocument) =>
                      DOCUMENT_TYPE_LABELS[missingDocument.documentType],
                  )
                  .join(', ')}
              </span>
            )}
            <span className="text-caption text-ink-secondary">
              {decision.verifier.name} · {formatDateTime(decision.createdAt)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function DecisionPanel({
  claimId,
  decisions,
  draft,
  onDraftChange,
  recommendation,
  suggestedDocumentTypes,
}: {
  claimId: string;
  decisions: ClaimDecision[];
  draft: DecisionDraft;
  onDraftChange: (draft: DecisionDraft) => void;
  recommendation: DecisionAction | null;
  suggestedDocumentTypes: DocumentType[];
}) {
  const queryClient = useQueryClient();
  const isClarification = draft.action === 'REQUEST_CLARIFICATION';
  const decisionMutation = useMutation({
    mutationFn: (action: DecisionAction) =>
      recordDecision(claimId, {
        action,
        reason: draft.reason,
        missingDocumentTypes:
          action === 'REQUEST_CLARIFICATION' ? draft.missingDocumentTypes : [],
      }),
    onSuccess: () => {
      onDraftChange(EMPTY_DECISION_DRAFT);
      return queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
  });
  const savedDecision = decisionMutation.data;
  const canSubmit =
    draft.action !== '' &&
    draft.reason.trim().length >= MIN_REASON_LENGTH &&
    (!isClarification || draft.missingDocumentTypes.length > 0) &&
    !decisionMutation.isPending;

  function changeAction(action: DecisionAction) {
    const shouldSuggestDocuments =
      action === 'REQUEST_CLARIFICATION' &&
      draft.missingDocumentTypes.length === 0;
    onDraftChange({
      ...draft,
      action,
      missingDocumentTypes: shouldSuggestDocuments
        ? suggestedDocumentTypes
        : draft.missingDocumentTypes,
    });
  }

  function toggleMissingDocument(
    documentType: DocumentType,
    isChecked: boolean,
  ) {
    onDraftChange({
      ...draft,
      missingDocumentTypes: isChecked
        ? DOCUMENT_TYPES.filter(
            (type) =>
              type === documentType ||
              draft.missingDocumentTypes.includes(type),
          )
        : draft.missingDocumentTypes.filter((type) => type !== documentType),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.action) decisionMutation.mutate(draft.action);
  }

  return (
    <section
      aria-labelledby="decision-panel-heading"
      data-tour="claim-decision-panel"
      className="flex flex-col gap-4 rounded-xl border border-hairline bg-surface shadow-xs p-4"
    >
      <div className="flex flex-col gap-0.5">
        <h2
          id="decision-panel-heading"
          className="text-body font-semibold tracking-display text-ink"
        >
          Keputusan verifikator
        </h2>
        <p className="text-caption text-ink-secondary">
          INTEGRA menandai, Anda yang memutuskan.
        </p>
      </div>
      {savedDecision && (
        <Alert role="status" className="border-success/30 bg-success/10">
          <LuCircleCheck aria-hidden="true" className="text-success-ink" />
          <AlertTitle className="text-success-ink">
            Keputusan tersimpan:{' '}
            {DECISION_ACTION_DETAILS[savedDecision.action].label}
          </AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2 text-ink-secondary">
            Status klaim di antrean sudah diperbarui.
            <Button asChild size="sm" variant="outline">
              <Link href="/claims">Kembali ke antrean</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <RadioGroup
          value={draft.action}
          onValueChange={(action) => changeAction(action as DecisionAction)}
          aria-label="Pilih keputusan"
          className="gap-2"
        >
          {DECISION_ACTIONS.map((action) => (
            <label
              key={action}
              htmlFor={`decision-${action}`}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md border border-hairline px-3 py-2',
                DECISION_TONE_CLASS_NAMES[action].option,
              )}
            >
              <RadioGroupItem
                id={`decision-${action}`}
                value={action}
                className={DECISION_TONE_CLASS_NAMES[action].radio}
              />
              <span className="flex flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-1.5 text-small font-medium text-ink">
                  {DECISION_ACTION_DETAILS[action].label}
                  {action === recommendation && (
                    <Pill tone="outline">Rekomendasi INTEGRA</Pill>
                  )}
                </span>
                <span className="text-caption text-ink-secondary">
                  {DECISION_ACTION_DETAILS[action].description}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
        {isClarification && (
          <fieldset className="flex flex-col gap-2 rounded-md border border-warning/30 bg-warning/10 p-3">
            <legend className="sr-only">Dokumen yang kurang</legend>
            <span className="text-small font-medium text-ink">
              Dokumen yang kurang
            </span>
            <span className="text-caption text-ink-secondary">
              Faskes melengkapinya di VEDIKA. Centang minimal satu.
            </span>
            {DOCUMENT_TYPES.map((documentType) => (
              <label
                key={documentType}
                htmlFor={`missing-${documentType}`}
                className="flex cursor-pointer items-center gap-2 text-small text-ink"
              >
                <Checkbox
                  id={`missing-${documentType}`}
                  checked={draft.missingDocumentTypes.includes(documentType)}
                  onCheckedChange={(isChecked) =>
                    toggleMissingDocument(documentType, isChecked === true)
                  }
                />
                {DOCUMENT_TYPE_LABELS[documentType]}
                {suggestedDocumentTypes.includes(documentType) && (
                  <span className="text-caption text-ink-secondary">
                    (disarankan dari Uji Ada)
                  </span>
                )}
              </label>
            ))}
          </fieldset>
        )}
        <Field>
          <FieldLabel htmlFor={DECISION_REASON_INPUT_ID} className="text-ink">
            Alasan
          </FieldLabel>
          <Textarea
            id={DECISION_REASON_INPUT_ID}
            required
            minLength={MIN_REASON_LENGTH}
            maxLength={MAX_REASON_LENGTH}
            value={draft.reason}
            onChange={(event) =>
              onDraftChange({ ...draft, reason: event.target.value })
            }
            placeholder="Sebutkan bukti yang dicek atau yang perlu dilengkapi faskes."
            className="min-h-24 border-hairline bg-surface"
          />
          <FieldDescription className="text-ink-secondary">
            Minimal {MIN_REASON_LENGTH} karakter. Tercatat sebagai jejak audit.
          </FieldDescription>
        </Field>
        {decisionMutation.isError && (
          <FieldError role="alert">
            Keputusan gagal disimpan. Periksa koneksi, lalu coba lagi.
          </FieldError>
        )}
        <Button type="submit" disabled={!canSubmit}>
          {decisionMutation.isPending ? 'Menyimpan…' : 'Simpan keputusan'}
        </Button>
      </form>
      <DecisionHistory decisions={decisions} />
    </section>
  );
}
