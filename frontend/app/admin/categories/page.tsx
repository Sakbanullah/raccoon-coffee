"use client";

import { useCallback, useEffect, useState } from "react";
import { Tags, Plus } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { EmptyState } from "@/components/admin/Overview";
import { cn } from "@/lib/utils";
import type { ProductCategory } from "@/types";

interface CategoryFormState {
  name: string;
  slug: string;
  displayOrder: string;
}

const EMPTY_FORM: CategoryFormState = {
  name: "",
  slug: "",
  displayOrder: "0",
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<ProductCategory | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    setAuthRequired(false);
    try {
      const res = await fetch("/api/product-categories", { cache: "no-store" });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setAuthRequired(true);
        } else {
          throw new Error("Could not load categories.");
        }
      } else {
        const json = await res.json();
        setCategories(json.data ?? []);
      }
    } catch {
      setListError("Could not reach the categories endpoint.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, displayOrder: String(categories.length + 1) });
    setFormErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (category: ProductCategory) => {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      displayOrder: String(category.displayOrder),
    });
    setFormErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required.";
    if (!form.slug.trim()) errors.slug = "Slug is required.";
    if (form.displayOrder.trim() && !/^\d+$/.test(form.displayOrder.trim())) {
      errors.displayOrder = "Display order must be a whole number.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      displayOrder: Number(form.displayOrder.trim() || "0"),
    };

    setSubmitting(true);
    try {
      const res = await fetch(editing ? `/api/product-categories/${editing.categoryId}` : "/api/product-categories", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
        throw new Error(message || "The category could not be saved.");
      }

      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "The category could not be saved.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!confirmingDelete) return;
    const id = confirmingDelete.categoryId;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/product-categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCategories((prev) => prev.filter((c) => c.categoryId !== id));
      setConfirmingDelete(null);
    } catch {
      setListError("Could not delete the category. Please retry.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Categories"
        description="Organize the menu into logical groups displayed to customers."
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-foreground">Menu Categories</h2>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand-primary-hover"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {listError && (
        <div
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {listError}
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-surface" />
          ))}
          <span className="sr-only">Loading categories…</span>
        </div>
      ) : authRequired ? (
        <EmptyState
          icon={Tags}
          title="Admin session required"
          body="Category management uses the raccoon_auth_token cookie. Sign in to manage categories."
          action={{ label: "Go to login", href: "/admin/login" }}
        />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          body="Add your first category to start organizing the menu."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.categoryId} className="border-t border-border bg-surface/50">
                  <td className="px-4 py-3 font-medium text-foreground">{category.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">/{category.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground">{category.displayOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(category)}
                        className="rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(category)}
                        className="rounded-md border border-destructive bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "Edit category" : "Add category"}
            className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-lg"
          >
            <h3 className="font-display text-lg font-semibold text-foreground">
              {editing ? "Edit category" : "Add category"}
            </h3>

            <form onSubmit={submitForm} className="mt-4 space-y-4" noValidate>
              <Field label="Name" error={formErrors.name} htmlFor="category-name">
                <input
                  id="category-name"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      slug: editing ? f.slug : slugify(name),
                    }));
                  }}
                  className="w-full rounded border border-border bg-input p-2 text-foreground"
                />
              </Field>

              <Field label="Slug" error={formErrors.slug} htmlFor="category-slug">
                <input
                  id="category-slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full rounded border border-border bg-input p-2 text-foreground"
                />
              </Field>

              <Field label="Display order" error={formErrors.displayOrder} htmlFor="category-order">
                <input
                  id="category-order"
                  inputMode="numeric"
                  value={form.displayOrder}
                  onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
                  className="w-full rounded border border-border bg-input p-2 text-foreground"
                />
              </Field>

              {formError && (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={submitting}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand-primary-hover disabled:opacity-50"
                >
                  {submitting ? "Saving…" : editing ? "Save changes" : "Create category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete"
            className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-lg"
          >
            <h3 className="font-display text-lg font-semibold text-foreground">Delete category?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              &ldquo;{confirmingDelete.name}&rdquo; will be permanently removed. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingDelete(null)}
                disabled={deletingId === confirmingDelete.categoryId}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId === confirmingDelete.categoryId}
                className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
              >
                {deletingId === confirmingDelete.categoryId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}