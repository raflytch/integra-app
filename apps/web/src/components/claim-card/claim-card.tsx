'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { LoadError } from '@/components/load-error';
import { fetchClaimDetail, isNotFoundError } from '@/services/claim.service';
import type { TestType } from '@/types/claim.types';
import { AiAnalysisCard } from './ai-analysis-card';
import { ClaimCardSkeleton, ClaimNotFound } from './claim-card-states';
import { ClaimDiagnoses } from './claim-diagnoses';
import { ClaimDocuments } from './claim-documents';
import { ClaimSummary } from './claim-summary';
import {
  DECISION_REASON_INPUT_ID,
  DecisionPanel,
  EMPTY_DECISION_DRAFT,
} from './decision-panel';
import { ExistencePanel } from './existence-panel';
import { TestPanel } from './test-panel';

function focusDecisionReason() {
  requestAnimationFrame(() => {
    const reasonInput = document.getElementById(DECISION_REASON_INPUT_ID);
    reasonInput?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    reasonInput?.focus({ preventScroll: true });
  });
}

export function ClaimCard({ claimId }: { claimId: string }) {
  const [decisionDraft, setDecisionDraft] = useState(EMPTY_DECISION_DRAFT);
  const claimQuery = useQuery({
    queryKey: ['claims', claimId],
    queryFn: () => fetchClaimDetail(claimId),
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
  });

  if (claimQuery.isPending) return <ClaimCardSkeleton />;
  if (claimQuery.isError) {
    return isNotFoundError(claimQuery.error) ? (
      <ClaimNotFound />
    ) : (
      <LoadError
        title="Kartu Klaim gagal dimuat"
        onRetry={() => claimQuery.refetch()}
      />
    );
  }

  const claim = claimQuery.data;
  const documentsById = new Map(
    claim.documents.map((document) => [document.id, document]),
  );
  const findingsOfType = (testType: TestType) =>
    claim.findings.filter((finding) => finding.testType === testType);

  function requestClarification(reason: string) {
    setDecisionDraft({ action: 'REQUEST_CLARIFICATION', reason });
    focusDecisionReason();
  }

  return (
    <div className="flex flex-col gap-6">
      <ClaimSummary claim={claim} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <AiAnalysisCard claim={claim} />
          <div data-tour="claim-test-panels" className="flex flex-col gap-4">
            <ExistencePanel
              findings={findingsOfType('EXISTENCE')}
              diagnoses={claim.diagnoses}
              tariffAmount={claim.tariffAmount}
              documentsById={documentsById}
              onRequestClarification={requestClarification}
            />
            <TestPanel
              testType="CONSISTENCY"
              findings={findingsOfType('CONSISTENCY')}
              documentsById={documentsById}
            />
            <TestPanel
              testType="SIMILARITY"
              findings={findingsOfType('SIMILARITY')}
              documentsById={documentsById}
            />
          </div>
        </div>
        <aside className="flex flex-col gap-4">
          <DecisionPanel
            claimId={claim.id}
            decisions={claim.decisions}
            draft={decisionDraft}
            onDraftChange={setDecisionDraft}
          />
          <ClaimDiagnoses
            diagnoses={claim.diagnoses}
            findings={claim.findings}
          />
          <ClaimDocuments documents={claim.documents} />
        </aside>
      </div>
    </div>
  );
}
