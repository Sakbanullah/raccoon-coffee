"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Product, ProductCategory } from "../../types";
import Reveal from "../ui/Reveal";

const CATEGORY_ICONS: Record<string, { src: string; alt: string }> = {
  "cat-coffee": { src: "/images/menu-icons/coffee.webp", alt: "Coffee" },
  "cat-milk": { src: "/images/menu-icons/milk-based.webp", alt: "Milk Base" },
  "cat-matcha": { src: "/images/menu-icons/matcha.webp", alt: "Matcha - Choco" },
  "cat-non": { src: "/images/menu-icons/tea.webp", alt: "Tea Series" },
  "cat-refreshing": { src: "/images/menu-icons/refreshing-drinks.webp", alt: "Refreshing Drinks" },
  "cat-cold": { src: "/images/menu-icons/frappe.webp", alt: "Cold Drinks" },
  "cat-food": { src: "/images/menu-icons/food.webp", alt: "Main Food" },
  "cat-bites": { src: "/images/menu-icons/snacks-dessert.webp", alt: "Snacks and Desserts" },
};

const FALLBACK_IMAGE = "/images/menu-placeholder.svg";

export default function FeaturedMenu() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
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

  // Load all public products once on mount. The public endpoint already
  // filters to ACTIVE + visible and orders by displayOrder; category
  // selection is done locally so switching tabs does not refetch.
  useEffect(() => {
    const controller = new AbortController();
    const loadProducts = async () => {
      setLoadingProds(true);
      setError(null);
      try {
        const res = await fetch("/api/products?public=true", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data?: Product[] };
        const items = json?.data?.filter((p) => p.status === "ACTIVE" && p.isVisible) ?? [];
        setAllProducts(items);
      } catch (e) {
        if (!controller.signal.aborted) setError("Menu gagal dimuat.");
      } finally {
        if (!controller.signal.aborted) setLoadingProds(false);
      }
    };
    void loadProducts();
    return () => controller.abort();
  }, []);

  // Products for the active category, capped at five like the previous
  // per-category fetch did with slice(0, 5).
  const products = useMemo(
    () => allProducts.filter((p) => p.categoryId === activeCategory).slice(0, 5),
    [allProducts, activeCategory],
  );

  const selectCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    setSelectedId(null);
  };

  // Falls back to the first product when nothing is picked or the picked one left the list.
  const selected = products.find((p) => p.productId === selectedId) ?? products[0] ?? null;

  // Crossfade bookkeeping. When the selection changes we keep the outgoing
  // product as a backdrop layer underneath the incoming one, so an image is
  // always painted. The sync runs during render (before commit), guaranteeing
  // the backdrop exists in the very first frame of the new image — no blank.
  const [backdrop, setBackdrop] = useState<Product | null>(null);
  const [shownId, setShownId] = useState<string | null>(null);
  const [newLoaded, setNewLoaded] = useState(false);
  const lastSelectedRef = useRef<Product | null>(null);
  if (selected && selected.productId !== shownId) {
    // If the incoming image never finished loading (rapid switching), keep the
    // backdrop that is actually painted on screen instead of swapping in an
    // unpainted one.
    setBackdrop((cur) => (newLoaded ? lastSelectedRef.current : cur));
    setShownId(selected.productId);
    setNewLoaded(false);
  }
  lastSelectedRef.current = selected;

  const categoryName = (categoryId: string) => categories.find((c) => c.categoryId === categoryId)?.name ?? "";

  const renderInfo = (p: Product) => (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-light">
        {categoryName(p.categoryId)}
      </p>
      <h3 className="mt-1.5 font-display text-xl leading-tight sm:text-3xl">{p.name}</h3>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-base font-semibold">
        Rp {Number(p.price).toLocaleString("id-ID")}
        {p.isBestSeller && (
          <span className="rounded-full border border-gold-light/70 px-2.5 py-0.5 text-xs font-medium text-gold-light">
            Best Seller
          </span>
        )}
      </p>
      {p.description && (
        <p className="mt-2 hidden text-sm leading-relaxed text-cream/85 sm:block sm:line-clamp-3">
          {p.description}
        </p>
      )}
    </>
  );

  const revealOffset = reduceMotion ? 0 : 18;

  return (
    <section id="menu" className="bg-cream-paper text-ink py-14 sm:py-20 lg:py-28">
      <div className="section-shell">
        <Reveal>
          <div className="text-center">
            <motion.p
              initial={{ opacity: 0, y: revealOffset }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="eyebrow text-coffee"
            >
              <span aria-hidden="true" className="mr-2 text-gold"></span>
              Today's Favorites
            </motion.p>
            <motion.h2
              className="mt-4 font-display text-3xl text-ink md:text-4xl"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              Kopi dan makanan untuk{" "}
              <em className="italic text-coffee">bersantai.</em>
            </motion.h2>
          </div>
        </Reveal>

        {/* Mobile: category scroller → featured banner → list (tight stack),
            kept via `contents` + order classes so the wrapper below dissolves.
            lg: two columns — left = category nav over product list (one flow),
            right = featured image sized by its own aspect ratio. The image sits
            in a single grid row and never contributes height between the nav
            and the list, so their spacing stays constant for any product count. */}
        <div className="mt-8 grid gap-5 sm:mt-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-x-10">
          <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:gap-y-6">
          {!loadingCats && categories.length > 0 && (
            <nav aria-label="Kategori menu" className="order-1 min-w-0">
              <ul className="-mx-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-2.5 sm:overflow-visible sm:px-0">
                {categories.map((cat) => {
                  const icon = CATEGORY_ICONS[cat.categoryId];
                  if (!icon) return null; // Only render categories that have an icon asset
                  const isActive = cat.categoryId === activeCategory;
                  return (
                    <li key={cat.categoryId} className="shrink-0 snap-start">
                      <button
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => selectCategory(cat.categoryId)}
                        className={[
                          "flex items-center gap-2 whitespace-nowrap rounded-full border py-1.5 pl-1.5 pr-4 text-xs font-medium transition-colors duration-200",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream-paper",
                          isActive
                            ? "border-forest-deep bg-forest-deep text-cream"
                            : "border-bark/20 bg-transparent text-ink/80 hover:border-bark/50 hover:bg-sand/40",
                        ].join(" ")}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-paper ring-1 ring-transparent">
                          <img src={icon.src} alt="" className="h-5 w-5 object-contain" draggable={false} />
                        </span>
                        {cat.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          <div className="order-3 min-w-0">
            {loadingProds ? (
              <p className="text-center text-ink/70">Memuat menu…</p>
            ) : error ? (
              <p className="text-center text-red-700">{error}</p>
            ) : !selected ? (
              <p className="text-center text-ink/60">Tidak ada produk dalam kategori ini.</p>
            ) : (
              <ul aria-label="Daftar produk" className="divide-y divide-bark/10">
                {products.map((p) => {
                  const isSelected = selected.productId === p.productId;
                  return (
                    <li key={p.productId}>
                      <button
                        type="button"
                        aria-current={isSelected ? "true" : undefined}
                        onClick={() => setSelectedId(p.productId)}
                        className={[
                          // Grid pins the dot, the name+leader, and the price; the
                          // middle column is minmax(0,1fr) so a long name can shrink
                          // and wrap instead of pushing the price off-screen.
                          "group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-3 rounded-full px-4 py-3 text-left transition-colors duration-200",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold",
                          isSelected ? "bg-sand/60" : "hover:bg-sand/30",
                        ].join(" ")}
                      >
                        <span
                          aria-hidden="true"
                          className={[
                            "h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full transition-colors",
                            isSelected ? "bg-gold" : "bg-transparent group-hover:bg-bark/30",
                          ].join(" ")}
                        />
                        <span className="flex min-w-0 items-baseline gap-x-3">
                          <span
                            className={[
                              "min-w-0 flex-1 break-words font-display text-base leading-snug sm:text-lg",
                              isSelected ? "text-forest-deep" : "text-ink/80",
                            ].join(" ")}
                          >
                            {p.name}
                          </span>
                          {/* Dotted leader keeps prices aligned like a printed menu.
                              Hidden on phones so the name has the full middle
                              column to wrap into; revealed at sm+ when there's room. */}
                          <span
                            aria-hidden="true"
                            className="hidden min-w-0 flex-1 translate-y-[-3px] self-stretch border-b border-dotted border-bark/40 sm:block"
                          />
                        </span>
                        <span
                          className={[
                            "shrink-0 whitespace-nowrap text-sm font-semibold",
                            isSelected ? "text-forest-deep" : "text-ink/70",
                          ].join(" ")}
                        >
                          Rp {Number(p.price).toLocaleString("id-ID")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          </div>

          {selected && !loadingProds && !error && (
            <article
              aria-live="polite"
              className="order-2 relative aspect-[16/10] min-w-0 overflow-hidden rounded-[1.75rem] bg-forest-deep sm:aspect-[4/3] lg:col-start-2 lg:row-start-1 lg:aspect-[4/5] lg:sticky lg:top-24 lg:self-start"
            >
              {/* Outgoing layer: stays painted underneath until the incoming image
                  has loaded and faded in, then unmounts. Never both gone. */}
              {backdrop && (
                <div className="absolute inset-0" aria-hidden="true">
                  <Image
                    src={backdrop.imageUrl ?? FALLBACK_IMAGE}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#18130E]/90 via-[#18130E]/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-cream sm:p-6">{renderInfo(backdrop)}</div>
                </div>
              )}
              {/* Incoming layer: invisible until its image fires onLoad, then
                  crossfades in with a very slight scale-up and horizontal settle. */}
              <motion.div
                key={selected.productId}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.02, x: reduceMotion ? 0 : 10 }}
                animate={
                  newLoaded
                    ? { opacity: 1, scale: 1, x: 0 }
                    : { opacity: 0, scale: reduceMotion ? 1 : 1.02, x: reduceMotion ? 0 : 10 }
                }
                transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                onAnimationComplete={() => {
                  if (newLoaded) setBackdrop(null);
                }}
              >
                <Image
                  src={selected.imageUrl ?? FALLBACK_IMAGE}
                  alt={selected.name}
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                  onLoad={() => setNewLoaded(true)}
                />
                {/* Transparent at top, darker at bottom, so the text stays readable and the subject stays visible. */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#18130E]/90 via-[#18130E]/40 to-transparent" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-cream sm:p-6">{renderInfo(selected)}</div>
              </motion.div>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
