"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { MapPin, Plus } from "lucide-react";
import { EmptyState } from "@/components/admin/Overview";

export default function BranchesPage() {
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Branches"
        description="Manage locations, opening hours, contact details, and active status."
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-foreground">Location Directory</h2>
        <a
          href="/admin/branches/new"
          className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-foreground hover:bg-brand-primary-hover"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add Branch
        </a>
      </div>
      <EmptyState
        icon={MapPin}
        title="Branch management coming soon"
        body="Create, edit, and deactivate branches via /api/branches."
        action={{ label: "View API inventory", href: "/admin" }}
      />
    </div>
  );
}