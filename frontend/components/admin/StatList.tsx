"use client";

import { OverviewCount, OverviewCounts } from "./useOverviewCounts";
import { OVERVIEW_SUMMARY } from "./Overview";

export interface StatItemProps {
  title: string;
  value: string | null;
  subtitle: string;
}

export function StatItem({ title, value, subtitle }: StatItemProps) {
  return (
    <div className="border-b border-border pb-2 last:border-0">
      <dl>
        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </dt>
        <dd className="mt-0.5 text-lg font-display text-foreground">
          {value ?? "—"}
        </dd>
        <dd className="mt-0.5 text-sm text-muted-foreground">{subtitle}</dd>
      </dl>
    </div>
  );
}

export function StatList({ counts }: { counts: OverviewCounts }) {
  return (
    <div className="grid max-w-2xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {OVERVIEW_SUMMARY.map((s) => {
        const count = counts[s.key];
        const display = counts.loading ? "…" : count.value?.toString() ?? "—";
        const sub =
          s.key === "photos"
            ? "Pending moderation"
            : s.key === "events" || s.key === "stories"
            ? "Published"
            : "Total";
        return (
          <StatItem
            key={s.key}
            title={s.title}
            value={display}
            subtitle={sub}
          />
        );
      })}
    </div>
  );
}
