import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Copy,
  FileSearch,
  Flag,
  Gauge,
  GitCompareArrows,
  type LucideIcon,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  CLAIM_STATUS_LABELS,
  DECISION_ACTION_DETAILS,
  TEST_TYPE_DETAILS,
} from '@/lib/claim-labels';
import { cn } from '@/lib/utils';
import type {
  ClaimStatus,
  DecisionAction,
  FacilityType,
  TestType,
} from '@/types/claim.types';

/** Chip tones from DESIGN.md. Indigo is reserved for interactive elements, so no chip uses it. */
const PILL_TONE_CLASS_NAMES = {
  outline: 'border-hairline bg-surface text-ink-secondary',
  neutral: 'border-transparent bg-subtle text-ink-secondary',
  success: 'border-success/30 bg-success/10 text-success-ink',
  warning: 'border-warning/30 bg-warning/10 text-warning-ink',
  error: 'border-error/30 bg-error/10 text-error-ink',
  inverse: 'border-transparent bg-ink text-surface',
} as const;

type PillTone = keyof typeof PILL_TONE_CLASS_NAMES;

const SEVERITY_LEVEL_NUMERALS = ['I', 'II', 'III'];

const CLAIM_STATUS_APPEARANCE: Record<
  ClaimStatus,
  { tone: PillTone; icon: LucideIcon }
> = {
  PENDING: { tone: 'outline', icon: CircleDashed },
  CLARIFICATION_REQUESTED: { tone: 'warning', icon: MessageSquareText },
  ESCALATED: { tone: 'error', icon: ShieldAlert },
  APPROVED: { tone: 'success', icon: CircleCheck },
};

const DECISION_ACTION_APPEARANCE: Record<
  DecisionAction,
  { tone: PillTone; icon: LucideIcon }
> = {
  APPROVE: CLAIM_STATUS_APPEARANCE.APPROVED,
  REQUEST_CLARIFICATION: CLAIM_STATUS_APPEARANCE.CLARIFICATION_REQUESTED,
  ESCALATE: CLAIM_STATUS_APPEARANCE.ESCALATED,
};

const TEST_TYPE_ICONS: Record<TestType, LucideIcon> = {
  EXISTENCE: FileSearch,
  CONSISTENCY: GitCompareArrows,
  SIMILARITY: Copy,
};

const PRIORITY_LEVELS: { minScore: number; label: string; tone: PillTone }[] = [
  { minScore: 0.7, label: 'Prioritas tinggi', tone: 'error' },
  { minScore: 0.4, label: 'Prioritas sedang', tone: 'warning' },
  { minScore: 0, label: 'Prioritas rendah', tone: 'neutral' },
];

export function Pill({
  tone,
  icon: Icon,
  className,
  children,
}: {
  tone: PillTone;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-2.5 py-0.5 text-caption',
        PILL_TONE_CLASS_NAMES[tone],
        className,
      )}
    >
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </Badge>
  );
}

export function ClaimStatusPill({ status }: { status: ClaimStatus }) {
  const { tone, icon } = CLAIM_STATUS_APPEARANCE[status];
  return (
    <Pill tone={tone} icon={icon}>
      {CLAIM_STATUS_LABELS[status]}
    </Pill>
  );
}

export function DecisionActionPill({ action }: { action: DecisionAction }) {
  const { tone, icon } = DECISION_ACTION_APPEARANCE[action];
  return (
    <Pill tone={tone} icon={icon}>
      {DECISION_ACTION_DETAILS[action].label}
    </Pill>
  );
}

export function NeedsClarificationPill() {
  return (
    <Pill tone="warning" icon={Flag}>
      Perlu klarifikasi
    </Pill>
  );
}

export function MissingEvidencePill() {
  return (
    <Pill tone="warning" icon={CircleAlert}>
      Belum ada bukti
    </Pill>
  );
}

export function PriorityPill({ priorityScore }: { priorityScore: number }) {
  if (priorityScore <= 0) return null;
  const priorityLevel =
    PRIORITY_LEVELS.find((level) => priorityScore >= level.minScore) ??
    PRIORITY_LEVELS[PRIORITY_LEVELS.length - 1];
  return (
    <Pill tone={priorityLevel.tone} icon={Gauge}>
      {priorityLevel.label}
    </Pill>
  );
}

export function TestSignalPill({
  testType,
  findingCount,
}: {
  testType: TestType;
  findingCount: number;
}) {
  const hasFindings = findingCount > 0;
  return (
    <Pill
      tone={hasFindings ? 'warning' : 'neutral'}
      icon={TEST_TYPE_ICONS[testType]}
    >
      {TEST_TYPE_DETAILS[testType].title}
      {hasFindings && ` · ${findingCount}`}
    </Pill>
  );
}

export function SeverityPill({ severityLevel }: { severityLevel: number }) {
  return (
    <Pill tone="outline">
      Severity {SEVERITY_LEVEL_NUMERALS[severityLevel - 1] ?? severityLevel}
    </Pill>
  );
}

export function FacilityTypePill({
  facilityType,
}: {
  facilityType: FacilityType;
}) {
  return <Pill tone="neutral">Tipe {facilityType}</Pill>;
}

export function IntegraAiPill() {
  return (
    <Pill tone="inverse" icon={Sparkles}>
      INTEGRA AI
    </Pill>
  );
}

export function ReadByAiPill() {
  return (
    <Pill tone="neutral" icon={Sparkles}>
      Dibaca AI
    </Pill>
  );
}
