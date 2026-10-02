import Image from 'next/image';
import type { ElementType } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TourStep } from './tour-steps';

export function TourStepCard({
  step,
  stepIndex,
  totalSteps,
  TitleElement,
  titleId,
  isTargetMissing = false,
  onSkip,
  onBack,
  onNext,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  TitleElement: ElementType;
  titleId?: string;
  isTargetMissing?: boolean;
  onSkip: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const isFirstStep = stepIndex === 0;

  return (
    <div className="flex flex-col gap-4">
      {step.showsLogo && (
        <Image
          src="/integra-logo.png"
          alt="INTEGRA"
          width={220}
          height={56}
          priority
        />
      )}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-quiet-gray">
          Langkah {stepIndex + 1} dari {totalSteps}
        </p>
        <TitleElement
          id={titleId}
          className="text-base leading-snug font-medium text-graphite"
        >
          {step.title}
        </TitleElement>
        <p className="text-sm leading-normal text-charcoal-copy">
          {isTargetMissing
            ? (step.missingTargetDescription ?? step.description)
            : step.description}
        </p>
      </div>
      {step.points && (
        <ul className="flex flex-col gap-1.5 rounded-lg bg-paper-beige px-4 py-3">
          {step.points.map((point) => (
            <li key={point.label} className="text-sm text-charcoal-copy">
              <span className="font-semibold text-graphite">
                {point.label}.
              </span>{' '}
              {point.detail}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: totalSteps }, (_, progressIndex) => (
          <span
            key={progressIndex}
            className={cn(
              'h-1 flex-1 rounded-full',
              progressIndex <= stepIndex
                ? 'bg-integra-deep'
                : 'bg-whiteboard-gray',
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-quiet-gray"
        >
          Lewati
        </Button>
        <div className="flex gap-2">
          {!isFirstStep && (
            <Button variant="outline" size="sm" onClick={onBack}>
              Kembali
            </Button>
          )}
          <Button size="sm" onClick={onNext} autoFocus>
            {step.nextLabel ?? 'Lanjut'}
          </Button>
        </div>
      </div>
    </div>
  );
}
