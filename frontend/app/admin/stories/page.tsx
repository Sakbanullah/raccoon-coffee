"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { Newspaper, Plus } from "lucide-react";
import { EmptyState } from "@/components/admin/Overview";

export default function StoriesPage() {
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Stories"
        description="Write and publish brand stories, news, and editorial content."
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-foreground">Content Studio</h2>
        <a
          href="/admin/stories/new"
          className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-foreground hover:bg-brand-primary-hover"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Write Story
        </a>
      </div>
      <EmptyState
        icon={Newspaper}
        title="Story management coming soon"
        body="Author and publish stories via /api/stories with DRAFT, PUBLISHED, and ARCHIVED states."
        action={{ label: "View API inventory", href: "/admin" }}
      />
    </div>
  );
}