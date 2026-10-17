"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { useOverviewCounts } from "@/components/admin/useOverviewCounts";
import { StatList } from "@/components/admin/StatList";
import { QuickActionLink } from "@/components/admin/QuickActionLink";
import { EmptyState } from "@/components/admin/Overview";
import { Image as Images } from "lucide-react";

export default function AdminOverviewPage() {
  const counts = useOverviewCounts();

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Dashboard Overview"
        description="Admin console – manage menu, locations, content and photo moderation."
      />

      {/* Statistics */}
      <section>
        <h2 className="font-display text-lg font-semibold text-foreground">Statistics</h2>
        <StatList counts={counts} />
      </section>

      {/* Work queue */}
      <section>
        <h2 className="font-display text-lg font-semibold text-foreground">Raccoon Wall moderation</h2>
        {counts.photos.value !== null && counts.photos.source !== "auth-required" ? (
          <p className="text-muted-foreground">
            {counts.photos.value} pending photo{counts.photos.value > 1 ? "s" : ""} to review.
          </p>
        ) : (
          <EmptyState
            icon={Images}
            title="No pending photos"
            body="All visitor uploads have been approved or rejected."
          />
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="font-display text-lg font-semibold text-foreground">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <QuickActionLink label="Add product" href="/admin/products" hint="Menu Management → Products" primary />
          <QuickActionLink label="Add event" href="/admin/events" hint="Content Studio → Events" />
          <QuickActionLink label="Review photos" href="/admin/raccoon-wall" hint="Raccoon Wall moderation" />
        </div>
      </section>
    </div>
  );
}