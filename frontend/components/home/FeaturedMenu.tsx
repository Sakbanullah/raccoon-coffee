"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Product, ProductCategory } from "../../types";
import Reveal from "../ui/Reveal";

const CATEGORY_ICONS: Record<string, { src: string; alt: string }> = {
  "cat-coffee": { src: "/images/menu-icons/coffee.png", alt: "Coffee" },
  "cat-milk": { src: "/images/menu-icons/milk-based.png", alt: "Milk Base" },
  "cat-matcha": { src: "/images/menu-icons/matcha.png", alt: "Matcha - Choco" },
  "cat-non": { src: "/images/menu-icons/tea.png", alt: "Tea Series" },
  "cat-refreshing": { src: "/images/menu-icons/refreshing-drinks.png", alt: "Refreshing Drinks" },
  "cat-cold": { src: "/images/menu-icons/frappe.png", alt: "Cold Drinks" },
  "cat-food": { src: "/images/menu-icons/food.png", alt: "Main Food" },
  "cat-bites": { src: "/images/menu-icons/snacks-dessert.png", alt: "Snacks and Desserts" },
};

const FALLBACK_IMAGE = "/images/menu-placeholder.svg";

export default function FeaturedMenu() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingProds, setLoadingProds] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("cat-coffee");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reduceMotion = useReducedMotion() ?? false;

  // Load categories on mount
  useEffect(() => {
    const controller = new AbortController();
    const loadCategories = async () => {
      try {
        const res = await fetch("/api/product-categories", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data?: ProductCategory[] };
        const cats = json?.data ?? [];
        setCategories(cats);
        if (cats.length > 0 && !cats.some((c) => c.categoryId === activeCategory)) {
          setActiveCategory(cats[0].categoryId);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError("Gagal memuat kategori menu.");
      } finally {
        if (!controller.signal.aborted) setLoadingCats(false);
      }
    };
    void loadCategories();
    return () => controller.abort();
  }, []);

  // Load products when active category changes
  useEffect(() => {
    if (!activeCategory) return;
    const controller = new AbortController();
    const loadProducts = async () => {
      setLoadingProds(true);
      setError(null);
      try {
        const res = await fetch(`/api/products?category=${activeCategory}&public=true`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data?: Product[] };
        const items = json?.data?.filter((p) => p.status === "ACTIVE" && p.isVisible) ?? [];
        setProducts(items);
      } catch (e) {
        if (!controller.signal.aborted) setError("Menu gagal dimuat.");
      } finally {
        if (!controller.signal.aborted) setLoadingProds(false);
      }
    };
    void loadProducts();
    return () => controller.abort();
  }, [activeCategory]);

  const selectCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    setSelectedId(null);
  };

  // Falls back to the first product when nothing is picked or the picked one left the list.
  const selected = products.find((p) => p.productId === selectedId) ?? products[0] ?? null;
  const selectedCategoryName = categories.find((c) => c.categoryId === activeCategory)?.name ?? "";

  const revealOffset = reduceMotion ? 0 : 18;

  return (
    <section id="menu" className="bg-cream text-forest py-16 lg:py-20">
      <div className="section-shell">
        <Reveal>
          <div className="text-center">
            <motion.p
              initial={{ opacity: 0, y: revealOffset }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="eyebrow text-[#5E7257]"
            >
              Today's Favorites
            </motion.p>
            <motion.h2
              className="mt-4 font-display text-4xl text-forest md:text-5xl"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              Kopi dan makanan untuk bersantai.
            </motion.h2>
          </div>
        </Reveal>

        {/* Desktop: left = one unified menu (category grid + product list), right = featured image, both top-aligned. */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="min-w-0">
            {!loadingCats && categories.length > 0 && (
              <nav aria-label="Kategori menu">
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  {categories.map((cat) => {
                    const icon = CATEGORY_ICONS[cat.categoryId];
                    if (!icon) return null; // Only render categories that have an icon asset
                    const isActive = cat.categoryId === activeCategory;
                    return (
                      <li key={cat.categoryId}>
                        <button
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => selectCategory(cat.categoryId)}
                          className={[
                            "flex w-full flex-col items-center rounded-xl border px-2 py-3 text-center transition-colors duration-200",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
                            isActive
                              ? "border-forest bg-forest text-cream"
                              : "border-forest/15 bg-cream-paper text-forest hover:border-forest/40 hover:bg-cream-dark/60",
                          ].join(" ")}
                        >
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream-paper ring-1 ring-forest/10">
                            <img src={icon.src} alt="" className="h-7 w-7 object-contain" draggable={false} />
                          </span>
                          {/* Fixed two-line label box keeps every card's label on the same baseline. */}
                          <span className="mt-2 flex h-8 items-start justify-center text-[11px] font-medium leading-tight sm:text-xs">
                            {cat.name}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}

            {loadingProds ? (
              <p className="mt-5 text-center">Memuat menu…</p>
            ) : error ? (
              <p className="mt-5 text-center text-red-700">{error}</p>
            ) : !selected ? (
              <p className="mt-5 text-center text-forest/70">Tidak ada produk dalam kategori ini.</p>
            ) : (
              <ul aria-label="Daftar produk" className="mt-5 divide-y divide-forest/10 border-y border-forest/10">
                {products.map((p) => {
                  const isSelected = selected.productId === p.productId;
                  return (
                    <li key={p.productId}>
                      <button
                        type="button"
                        aria-current={isSelected ? "true" : undefined}
                        onClick={() => setSelectedId(p.productId)}
                        className={[
                          "flex w-full items-baseline gap-4 border-l-2 py-2.5 pl-4 pr-2 text-left transition-colors duration-200",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold",
                          isSelected
                            ? "border-forest bg-cream-dark/70"
                            : "border-transparent hover:border-gold/70 hover:bg-cream-paper",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "min-w-0 flex-1 font-display text-lg leading-snug",
                            isSelected ? "text-forest" : "text-forest/85",
                          ].join(" ")}
                        >
                          {p.name}
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-forest">
                          Rp {Number(p.price).toLocaleString("id-ID")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selected && !loadingProds && !error && (
            <AnimatePresence mode="wait" initial={false}>
              <motion.article
                key={selected.productId}
                aria-live="polite"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="relative aspect-[4/5] min-w-0 overflow-hidden rounded-2xl bg-forest-deep lg:sticky lg:top-24 lg:self-start"
              >
                <Image
                  src={selected.imageUrl ?? FALLBACK_IMAGE}
                  alt={selected.name}
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
                {/* Transparent at top, darker at bottom, so the text stays readable and the subject stays visible. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-cream sm:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-light">
                    {selectedCategoryName}
                  </p>
                  <h3 className="mt-1.5 font-display text-2xl leading-tight sm:text-3xl">{selected.name}</h3>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-base font-semibold">
                    Rp {Number(selected.price).toLocaleString("id-ID")}
                    {selected.isBestSeller && (
                      <span className="rounded-full border border-gold-light/70 px-2.5 py-0.5 text-xs font-medium text-gold-light">
                        Best Seller
                      </span>
                    )}
                  </p>
                  {selected.description && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-cream/85">{selected.description}</p>
                  )}
                </div>
              </motion.article>
            </AnimatePresence>
          )}
        </div>
      </div>
    </section>
  );
}
