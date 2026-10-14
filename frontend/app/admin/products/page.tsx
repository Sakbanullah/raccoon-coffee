"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageIcon, Package, Plus, Search, X } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { EmptyState } from "@/components/admin/Overview";
import { cn } from "@/lib/utils";
import type { Product, ProductCategory, ProductStatus } from "@/types";

interface ProductFormState {
  name: string;
  slug: string;
  description: string;
  price: string;
  /** Currently stored image URL (existing product). Not editable. */
  imageUrl: string;
  /** Newly selected image file, uploaded on submit. */
  imageFile: File | null;
  /** User removed the stored image; sends `imageUrl: null`. */
  imageCleared: boolean;
  status: ProductStatus;
  displayOrder: string;
  categoryId: string;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  slug: "",
  description: "",
  price: "",
  imageUrl: "",
  imageFile: null,
  imageCleared: false,
  status: "ACTIVE",
  displayOrder: "0",
  categoryId: "",
};

// Mirrors server limits in backend/src/uploads/upload.config.ts.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const checkImageFile = (file: File): string | null => {
  if (!IMAGE_TYPES.includes(file.type))
    return "Image must be JPG, PNG, or GIF.";
  if (file.size > IMAGE_MAX_BYTES) return "Image must be 5 MB or smaller.";
  return null;
};

const uploadProductImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/products/upload-image", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(" ")
      : body?.message;
    throw new Error(message || "The image could not be uploaded.");
  }
  const json = await res.json();
  return json.data.imageUrl as string;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<Product | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!form.imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(form.imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.imageFile]);

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    setAuthRequired(false);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/product-categories", { cache: "no-store" }),
      ]);

      if (!productsRes.ok) {
        if (productsRes.status === 401 || productsRes.status === 403) {
          setAuthRequired(true);
        } else {
          throw new Error("Could not load products.");
        }
      } else {
        const json = await productsRes.json();
        setProducts(json.data ?? []);
      }

      if (categoriesRes.ok) {
        const json = await categoriesRes.json();
        setCategories(json.data ?? []);
      }
    } catch {
      setListError("Could not reach the products endpoint.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryName = (categoryId: string) =>
    categories.find((c) => c.categoryId === categoryId)?.name ?? "—";

  // Client-side filter over the already-loaded list. Matches name, slug, or category name.
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleProducts = normalizedQuery
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(normalizedQuery) ||
          p.slug.toLowerCase().includes(normalizedQuery) ||
          categoryName(p.categoryId).toLowerCase().includes(normalizedQuery),
      )
    : products;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.categoryId ?? "" });
    setFormErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      price: product.price,
      imageUrl: product.imageUrl ?? "",
      imageFile: null,
      imageCleared: false,
      status: product.status,
      displayOrder: String(product.displayOrder),
      categoryId: product.categoryId,
    });
    setFormErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required.";
    if (!form.slug.trim()) errors.slug = "Slug is required.";
    if (!form.categoryId) errors.categoryId = "Category is required.";
    if (!form.price.trim()) {
      errors.price = "Price is required.";
    } else if (!/^\d+(\.\d{1,2})?$/.test(form.price.trim())) {
      errors.price = "Price must be a number, e.g. 4.50.";
    }
    if (form.displayOrder.trim() && !/^\d+$/.test(form.displayOrder.trim())) {
      errors.displayOrder = "Display order must be a whole number.";
    }
    if (form.imageFile) {
      const imageError = checkImageFile(form.imageFile);
      if (imageError) errors.imageFile = imageError;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    const imageError = checkImageFile(file);
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.imageFile;
      if (imageError) next.imageFile = imageError;
      return next;
    });
    if (imageError) return;
    setFormError(null);
    setForm((f) => ({ ...f, imageFile: file, imageCleared: false }));
  };

  const removeImage = () => {
    setForm((f) => ({ ...f, imageFile: null, imageCleared: true }));
  };

  // Image shown in the form: pending file preview, else stored image unless removed.
  const shownImage = form.imageFile
    ? previewUrl
    : form.imageCleared
      ? null
      : form.imageUrl || null;

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Only send imageUrl when it changes: stored values from before this
      // upload flow (e.g. /images/...) would fail server validation if re-sent.
      let imageUrl: string | null | undefined;
      if (form.imageFile) {
        setUploading(true);
        imageUrl = await uploadProductImage(form.imageFile);
        setUploading(false);
      } else if (form.imageCleared) {
        imageUrl = null;
      }

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        price: form.price.trim(),
        status: form.status,
        displayOrder: Number(form.displayOrder.trim() || "0"),
        categoryId: form.categoryId,
        ...(imageUrl !== undefined && { imageUrl }),
      };

      const res = await fetch(
        editing ? `/api/products/${editing.productId}` : "/api/products",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = Array.isArray(body?.message)
          ? body.message.join(" ")
          : body?.message;
        throw new Error(message || "The product could not be saved.");
      }

      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "The product could not be saved.",
      );
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  const toggleStatus = async (product: Product) => {
    const next: ProductStatus =
      product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setProducts((prev) =>
      prev.map((p) =>
        p.productId === product.productId ? { ...p, status: next } : p,
      ),
    );
    try {
      const res = await fetch(`/api/products/${product.productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert optimistic update on failure.
      setProducts((prev) =>
        prev.map((p) =>
          p.productId === product.productId
            ? { ...p, status: product.status }
            : p,
        ),
      );
      setListError("Could not update the product status. Please retry.");
    }
  };

  const confirmDelete = async () => {
    if (!confirmingDelete) return;
    const id = confirmingDelete.productId;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProducts((prev) => prev.filter((p) => p.productId !== id));
      setConfirmingDelete(null);
    } catch {
      setListError("Could not delete the product. Please retry.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Products"
        description="Manage coffee menu items, descriptions, pricing, and availability across branches."
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Product Catalog
        </h2>
        <button
          type="button"
          onClick={openCreate}
          disabled={categories.length === 0}
          className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add Product
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
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border border-border bg-surface"
            />
          ))}
          <span className="sr-only">Loading products…</span>
        </div>
      ) : authRequired ? (
        <EmptyState
          icon={Package}
          title="Admin session required"
          body="Product management uses the raccoon_auth_token cookie. Sign in to manage the menu."
          action={{ label: "Go to login", href: "/admin/login" }}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          body={
            categories.length === 0
              ? "Create a product category first, then add products to it."
              : "Add your first menu item to get started."
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              aria-label="Search products"
              placeholder="Search by name, slug, or category…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchQuery("");
              }}
              className="w-full rounded-md border border-border bg-input py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>

          {visibleProducts.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching products"
              body={`Nothing matches "${searchQuery.trim()}". Try another name, slug, or category.`}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((product) => (
                    <tr
                      key={product.productId}
                      className="border-t border-border bg-surface/50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          /{product.slug}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {categoryName(product.categoryId)}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {product.price}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {product.displayOrder}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleStatus(product)}
                          aria-pressed={product.status === "ACTIVE"}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            product.status === "ACTIVE"
                              ? "border-brand-primary bg-brand-primary/20 text-foreground"
                              : "border-border bg-surface text-muted-foreground",
                          )}
                        >
                          {product.status === "ACTIVE" ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            className="rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDelete(product)}
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
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "Edit product" : "Add product"}
            className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-lg"
          >
            <h3 className="font-display text-lg font-semibold text-foreground">
              {editing ? "Edit product" : "Add product"}
            </h3>

            <form onSubmit={submitForm} className="mt-4 space-y-4" noValidate>
              <Field
                label="Name"
                error={formErrors.name}
                htmlFor="product-name"
              >
                <input
                  id="product-name"
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

              <Field
                label="Slug"
                error={formErrors.slug}
                htmlFor="product-slug"
              >
                <input
                  id="product-slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  className="w-full rounded border border-border bg-input p-2 text-foreground"
                />
              </Field>

              <Field
                label="Category"
                error={formErrors.categoryId}
                htmlFor="product-category"
              >
                <select
                  id="product-category"
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoryId: e.target.value }))
                  }
                  className="w-full rounded border border-border bg-input p-2 text-foreground"
                >
                  <option value="">Select a category…</option>
                  {categories.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Price"
                  error={formErrors.price}
                  htmlFor="product-price"
                >
                  <input
                    id="product-price"
                    inputMode="decimal"
                    placeholder="4.50"
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                    className="w-full rounded border border-border bg-input p-2 text-foreground"
                  />
                </Field>
                <Field
                  label="Display order"
                  error={formErrors.displayOrder}
                  htmlFor="product-order"
                >
                  <input
                    id="product-order"
                    inputMode="numeric"
                    value={form.displayOrder}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, displayOrder: e.target.value }))
                    }
                    className="w-full rounded border border-border bg-input p-2 text-foreground"
                  />
                </Field>
              </div>

              <Field
                label="Image (optional)"
                error={formErrors.imageFile}
                htmlFor="product-image-file"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-input">
                    {shownImage ? (
                      // eslint-disable-next-line @next/next/no-img-element -- blob previews and /api upload paths
                      <img
                        src={shownImage}
                        alt="Product preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon
                        aria-hidden="true"
                        className="h-6 w-6 text-muted-foreground"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      id="product-image-file"
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={onImageSelect}
                      disabled={submitting}
                      className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-surface-elevated file:px-3 file:py-1.5 file:text-sm file:text-foreground hover:file:bg-surface disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, or GIF · max 5 MB
                    </p>
                    {shownImage && (
                      <button
                        type="button"
                        onClick={removeImage}
                        disabled={submitting}
                        className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
                      >
                        Remove image
                      </button>
                    )}
                    {uploading && (
                      <p
                        role="status"
                        aria-live="polite"
                        className="text-xs text-muted-foreground"
                      >
                        Uploading image…
                      </p>
                    )}
                  </div>
                </div>
              </Field>

              <Field
                label="Description (optional)"
                htmlFor="product-description"
              >
                <textarea
                  id="product-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full rounded border border-border bg-input p-2 text-foreground"
                />
              </Field>

              <Field label="Status" htmlFor="product-status">
                <select
                  id="product-status"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as ProductStatus,
                    }))
                  }
                  className="w-full rounded border border-border bg-input p-2 text-foreground"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
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
                  {uploading
                    ? "Uploading…"
                    : submitting
                      ? "Saving…"
                      : editing
                        ? "Save changes"
                        : "Create product"}
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
            <h3 className="font-display text-lg font-semibold text-foreground">
              Delete product?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              &ldquo;{confirmingDelete.name}&rdquo; will be permanently removed.
              This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingDelete(null)}
                disabled={deletingId === confirmingDelete.productId}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId === confirmingDelete.productId}
                className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
              >
                {deletingId === confirmingDelete.productId
                  ? "Deleting…"
                  : "Delete"}
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
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
