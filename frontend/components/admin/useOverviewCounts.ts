"use client";

import { useEffect, useState } from "react";

export type CountSource = "public-list" | "auth-required" | "unavailable";

export interface OverviewCount {
  value: number | null;
  source: CountSource;
}

export interface OverviewCounts {
  products: OverviewCount;
  categories: OverviewCount;
  branches: OverviewCount;
  events: OverviewCount;
  stories: OverviewCount;
  photos: OverviewCount;
  loading: boolean;
  backendReachable: boolean;
}

type ListResponse = { data?: unknown[]; meta?: { total?: number } };

/**
 * ponytail: derived counts only — no analytics endpoint exists in the backend.
 * Events/Stories counts are PUBLISHED-only because the public list endpoints filter by status.
 * Pending-photo count requires the raccoon_auth_token cookie, so it reports 401 as "auth-required".
 */
export function useOverviewCounts(): OverviewCounts {
  const [state, setState] = useState<OverviewCounts>({
    products: { value: null, source: "unavailable" },
    categories: { value: null, source: "unavailable" },
    branches: { value: null, source: "unavailable" },
    events: { value: null, source: "unavailable" },
    stories: { value: null, source: "unavailable" },
    photos: { value: null, source: "unavailable" },
    loading: true,
    backendReachable: false,
  });

  useEffect(() => {
    const controller = new AbortController();

    const load = async (path: string): Promise<{ value: number | null; source: CountSource }> => {
      try {
        const res = await fetch(path, { signal: controller.signal, cache: "no-store" });
        if (res.status === 401) return { value: null, source: "auth-required" };
        if (!res.ok) return { value: null, source: "unavailable" };
        const json = (await res.json()) as ListResponse;
        const total = json.meta?.total ?? json.data?.length ?? null;
        return { value: total, source: "public-list" };
      } catch {
        return { value: null, source: "unavailable" };
      }
    };

    void (async () => {
      const [products, categories, branches, events, stories, photos] = await Promise.all([
        load("/api/products"),
        load("/api/product-categories"),
        load("/api/branches"),
        load("/api/events"),
        load("/api/stories"),
        load("/api/photos/pending"),
      ]);

      if (controller.signal.aborted) return;
      setState({
        products,
        categories,
        branches,
        events,
        stories,
        photos,
        loading: false,
        backendReachable: [products, categories, branches, events, stories].some(
          (c) => c.source === "public-list",
        ),
      });
    })();

    return () => controller.abort();
  }, []);

  return state;
}
