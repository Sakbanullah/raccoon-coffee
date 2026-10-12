"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { Package, Plus } from "lucide-react";
import { EmptyState } from "@/components/admin/Overview";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Products"
        description="Manage coffee menu items, descriptions, pricing, and availability across branches."
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-foreground">Product Catalog</h2>
        <a
          href="/admin/products/new"
          className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-foreground hover:bg-brand-primary-hover"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add Product
        </a>
      </div>
      <EmptyState
        icon={Package}
        title="Product management coming soon"
        body="Full CRUD for products will be implemented in the next phase. The backend API endpoints are ready at /api/products."
        action={{ label: "View API inventory", href: "/admin" }}
      />
    </div>
  );
}