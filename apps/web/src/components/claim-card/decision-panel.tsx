'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LuCircleCheck } from 'react-icons/lu';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { DecisionActionPill } from '@/components/claim-pills';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { DECISION_ACTION_DETAILS } from '@/lib/claim-labels';
import { formatDateTime } from '@/lib/format';
import { recordDecision } from '@/services/claim.service';
import type { ClaimDecision, DecisionAction } from '@/types/claim.types';

export interface DecisionDraft {
  action: DecisionAction | '';
  reason: string;
}

export const EMPTY_DECISION_DRAFT: DecisionDraft = { action: '', reason: '' };
export const DECISION_REASON_INPUT_ID = 'decision-reason';

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 1000;
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
}: {
  claimId: string;
  decisions: ClaimDecision[];
  draft: DecisionDraft;
  onDraftChange: (draft: DecisionDraft) => void;
}) {
  const queryClient = useQueryClient();
  const decisionMutation = useMutation({
    mutationFn: (action: DecisionAction) =>
      recordDecision(claimId, { action, reason: draft.reason }),
    onSuccess: () => {
      onDraftChange(EMPTY_DECISION_DRAFT);
      return queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
  });
  const savedDecision = decisionMutation.data;
  const canSubmit =
    draft.action !== '' &&
    draft.reason.trim().length >= MIN_REASON_LENGTH &&
    !decisionMutation.isPending;

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
          onValueChange={(action) =>
            onDraftChange({ ...draft, action: action as DecisionAction })
          }
          aria-label="Pilih keputusan"
          className="gap-2"
        >
          {DECISION_ACTIONS.map((action) => (
            <label
              key={action}
              htmlFor={`decision-${action}`}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-hairline px-3 py-2 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-wash"
            >
              <RadioGroupItem
                id={`decision-${action}`}
                value={action}
                className="mt-0.5"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-small font-medium text-ink">
                  {DECISION_ACTION_DETAILS[action].label}
                </span>
                <span className="text-caption text-ink-secondary">
                  {DECISION_ACTION_DETAILS[action].description}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
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
