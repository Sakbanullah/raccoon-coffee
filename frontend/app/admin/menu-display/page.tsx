"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Eye, EyeOff, Star, ChevronUp, ChevronDown } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { EmptyState } from "@/components/admin/Overview";
import { cn } from "@/lib/utils";
import type { Product, ProductCategory } from "@/types";
import { apiFetch } from "@/lib/api";

type VisibilityFilter = "all" | "visible" | "hidden";
type BestSellerFilter = "all" | "bestseller" | "normal";

interface MenuDisplayProduct extends Product {
  categoryName: string;
}

export default function MenuDisplayPage() {
  const [products, setProducts] = useState<MenuDisplayProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [bestSellerFilter, setBestSellerFilter] = useState<BestSellerFilter>("all");

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    setAuthRequired(false);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/products/admin", { cache: "no-store" }),
        fetch("/api/product-categories", { cache: "no-store" }),
      ]);

      if (productsRes.status === 401 || productsRes.status === 403) {
        setAuthRequired(true);
        return;
      }
      if (!productsRes.ok) {
        setListError(`Products request failed (HTTP ${productsRes.status}). Check the backend logs.`);
        return;
      }

      // Read each body exactly once; a Response body cannot be read twice.
      const prodJson = await productsRes.json();
      const prods = (prodJson.data ?? []) as Product[];
      const cats = categoriesRes.ok ? (((await categoriesRes.json()).data ?? []) as ProductCategory[]) : [];
      const catMap = new Map<string, string>(cats.map((c) => [c.categoryId, c.name]));
      setProducts(prods.map((p) => ({ ...p, categoryName: catMap.get(p.categoryId) ?? "—" })));
      setCategories(cats);
    } catch {
      setListError("Could not reach the backend. Make sure it is running on port 3001.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredProducts = products
    .filter((p) => {
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
      if (visibilityFilter === "visible" && !p.isVisible) return false;
      if (visibilityFilter === "hidden" && p.isVisible) return false;
      if (bestSellerFilter === "bestseller" && !p.isBestSeller) return false;
      if (bestSellerFilter === "normal" && p.isBestSeller) return false;
      return true;
    })
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

  const toggleVisibility = async (product: MenuDisplayProduct) => {
    const nextVisible = !product.isVisible;
    setUpdatingId(product.productId);
    setProducts((prev) =>
      prev.map((p) => (p.productId === product.productId ? { ...p, isVisible: nextVisible } : p)),
    );
    try {
      const res = await apiFetch(`/api/products/${product.productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: nextVisible }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.productId === product.productId ? { ...p, isVisible: product.isVisible } : p)),
      );
      setListError("Could not update visibility. Please retry.");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleBestSeller = async (product: MenuDisplayProduct) => {
    const nextBestSeller = !product.isBestSeller;
    setUpdatingId(product.productId);
    setProducts((prev) =>
      prev.map((p) => (p.productId === product.productId ? { ...p, isBestSeller: nextBestSeller } : p)),
    );
    try {
      const res = await apiFetch(`/api/products/${product.productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBestSeller: nextBestSeller }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.productId === product.productId ? { ...p, isBestSeller: product.isBestSeller } : p)),
      );
      setListError("Could not update best seller status. Please retry.");
    } finally {
      setUpdatingId(null);
    }
  };

  const changeDisplayOrder = async (product: MenuDisplayProduct, delta: number) => {
    const newOrder = Math.max(0, product.displayOrder + delta);
    setUpdatingId(product.productId);
    setProducts((prev) =>
      prev.map((p) => (p.productId === product.productId ? { ...p, displayOrder: newOrder } : p)),
    );
    try {
      const res = await apiFetch(`/api/products/${product.productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayOrder: newOrder }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.productId === product.productId ? { ...p, displayOrder: product.displayOrder } : p)),
      );
      setListError("Could not update display order. Please retry.");
    } finally {
      setUpdatingId(null);
    }
  };

  const statusBadge = (product: MenuDisplayProduct) => {
    if (product.status === "INACTIVE") return <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">Inactive</span>;
    if (!product.isVisible) return <span className="rounded-full border border-destructive bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">Hidden</span>;
    return <span className="rounded-full border border-brand-primary bg-brand-primary/20 px-3 py-1 text-xs font-medium text-foreground">Visible</span>;
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Menu Display Settings"
        description="Control which products appear on the public website, mark best sellers, and manage display order."
      />

      {listError && (
        <div
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {listError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-foreground">Product Display Management</h2>
      </div>

      <div className="space-y-4 p-4 rounded-lg border border-border bg-surface/50">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search products…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-input pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground min-w-[180px]"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.categoryId} value={c.categoryId}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground min-w-[150px]"
          >
            <option value="all">All</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
          <select
            value={bestSellerFilter}
            onChange={(e) => setBestSellerFilter(e.target.value as BestSellerFilter)}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground min-w-[150px]"
          >
            <option value="all">All</option>
            <option value="bestseller">Best Sellers</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-surface" />
          ))}
          <span className="sr-only">Loading products…</span>
        </div>
      ) : authRequired ? (
        <EmptyState
          icon={Eye}
          title="Admin session required"
          body="Menu display management uses the raccoon_auth_token cookie. Sign in to manage display settings."
          action={{ label: "Go to login", href: "/admin/login" }}
        />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="No products match"
          body="Try adjusting your filters or search query."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium w-[100px] text-center">Visible</th>
                <th className="px-4 py-3 font-medium w-[120px] text-center">Best Seller</th>
                <th className="px-4 py-3 font-medium w-[140px] text-center">Display Order</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.productId} className="border-t border-border bg-surface/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">/{product.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{product.categoryName}</td>
                  <td className="px-4 py-3 text-foreground">Rp {Number(product.price).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3">{statusBadge(product)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleVisibility(product)}
                      disabled={updatingId === product.productId}
                      aria-label={product.isVisible ? "Hide from website" : "Show on website"}
                      className={cn(
                        "inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors",
                        product.isVisible
                          ? "bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      {product.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleBestSeller(product)}
                      disabled={updatingId === product.productId}
                      aria-label={product.isBestSeller ? "Remove from best sellers" : "Mark as best seller"}
                      className={cn(
                        "inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors",
                        product.isBestSeller
                          ? "bg-gold/20 text-gold hover:bg-gold/30"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      <Star className={cn("h-4 w-4", product.isBestSeller && "fill-current")} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => changeDisplayOrder(product, -1)}
                        disabled={updatingId === product.productId || product.displayOrder === 0}
                        aria-label="Move up"
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
                          "hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed",
                        )}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <span className="w-12 text-center font-mono text-sm text-foreground">{product.displayOrder}</span>
                      <button
                        type="button"
                        onClick={() => changeDisplayOrder(product, 1)}
                        disabled={updatingId === product.productId}
                        aria-label="Move down"
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
                          "hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed",
                        )}
                      >
                        <ChevronDown className="h-4 w-4" />
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
  );
}