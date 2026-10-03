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

const PILL_TONE_CLASS_NAMES = {
  neutral: 'border-linen-border bg-eggshell-canvas text-charcoal-copy',
  muted: 'border-transparent bg-cloud-surface text-quiet-gray',
  warm: 'border-transparent bg-paper-beige text-graphite',
  brand: 'border-transparent bg-integra-wash text-integra-deep',
  brandStrong: 'border-transparent bg-integra-deep text-white',
  strong: 'border-transparent bg-graphite text-white',
} as const;

type PillTone = keyof typeof PILL_TONE_CLASS_NAMES;

const SEVERITY_LEVEL_NUMERALS = ['I', 'II', 'III'];

const CLAIM_STATUS_APPEARANCE: Record<
  ClaimStatus,
  { tone: PillTone; icon: LucideIcon }
> = {
  PENDING: { tone: 'neutral', icon: CircleDashed },
  CLARIFICATION_REQUESTED: { tone: 'warm', icon: MessageSquareText },
  ESCALATED: { tone: 'strong', icon: ShieldAlert },
  APPROVED: { tone: 'brand', icon: CircleCheck },
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
  { minScore: 0.7, label: 'Prioritas tinggi', tone: 'brandStrong' },
  { minScore: 0.4, label: 'Prioritas sedang', tone: 'brand' },
  { minScore: 0, label: 'Prioritas rendah', tone: 'muted' },
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
      className={cn(PILL_TONE_CLASS_NAMES[tone], className)}
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
    <Pill tone="brand" icon={Flag}>
      Perlu klarifikasi
    </Pill>
  );
}

export function MissingEvidencePill() {
  return (
    <Pill tone="brand" icon={CircleAlert}>
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
      tone={hasFindings ? 'brand' : 'muted'}
      icon={TEST_TYPE_ICONS[testType]}
    >
      {TEST_TYPE_DETAILS[testType].title}
      {hasFindings && ` · ${findingCount}`}
    </Pill>
  );
}

export function SeverityPill({ severityLevel }: { severityLevel: number }) {
  return (
    <Pill tone="neutral">
      Severity {SEVERITY_LEVEL_NUMERALS[severityLevel - 1] ?? severityLevel}
    </Pill>
  );
}

export function FacilityTypePill({
  facilityType,
}: {
  facilityType: FacilityType;
}) {
  return <Pill tone="muted">Tipe {facilityType}</Pill>;
}

export function IntegraAiPill() {
  return (
    <Pill tone="brandStrong" icon={Sparkles}>
      INTEGRA AI
    </Pill>
  );
}

export function ReadByAiPill() {
  return (
    <Pill tone="brand" icon={Sparkles}>
      Dibaca AI
    </Pill>
  );
}
