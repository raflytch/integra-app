'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export interface StatusFilterTab<Value extends string> {
  value: Value;
  label: string;
  count?: number;
}

export function StatusFilterTabs<Value extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  description,
}: {
  tabs: StatusFilterTab<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  ariaLabel: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(selectedValue) =>
          selectedValue && onChange(selectedValue as Value)
        }
        aria-label={ariaLabel}
        spacing={2}
        className="flex-wrap"
      >
        {tabs.map((tab) => (
          <ToggleGroupItem
            key={tab.value}
            value={tab.value}
            className="group h-8 gap-1.5 rounded-full border border-hairline bg-surface px-3 text-small font-medium text-ink-secondary hover:bg-subtle hover:text-ink data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="rounded-full bg-subtle px-1.5 text-caption text-ink-secondary tabular-nums group-data-[state=on]:bg-primary-foreground/20 group-data-[state=on]:text-primary-foreground">
                {tab.count.toLocaleString('id-ID')}
              </span>
            )}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {description && (
        <p className="text-small text-ink-secondary">{description}</p>
      )}
    </div>
  );
}
