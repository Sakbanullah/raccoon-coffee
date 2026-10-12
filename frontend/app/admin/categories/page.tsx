"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { Tags, Plus } from "lucide-react";
import { EmptyState } from "@/components/admin/Overview";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Categories"
        description="Organize the menu into logical groups displayed to customers."
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-foreground">Menu Categories</h2>
        <a
          href="/admin/categories/new"
          className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-foreground hover:bg-brand-primary-hover"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add Category
        </a>
      </div>
      <EmptyState
        icon={Tags}
        title="Category management coming soon"
        body="Full CRUD for product categories is ready via /api/product-categories."
        action={{ label: "View API inventory", href: "/admin" }}
      />
    </div>
  );
}