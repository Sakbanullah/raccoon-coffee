"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { CalendarDays, Plus } from "lucide-react";
import { EmptyState } from "@/components/admin/Overview";

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Events"
        description="Schedule and publish upcoming events at Raccoon Coffee."
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-foreground">Event Calendar</h2>
        <a
          href="/admin/events/new"
          className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-foreground hover:bg-brand-primary-hover"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          New Event
        </a>
      </div>
      <EmptyState
        icon={CalendarDays}
        title="Event management coming soon"
        body="Create, edit, and publish events via /api/events. Published events appear on the public homepage."
        action={{ label: "View API inventory", href: "/admin" }}
      />
    </div>
  );
}