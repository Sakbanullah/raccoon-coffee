"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import { Product } from "../../types";
import Reveal from "../ui/Reveal";

const CATEGORY_MAP = [
  {
    id: "cat-coffee",
    label: "COFFEE",
  },
  {
    id: "cat-milk",
    label: "MILK",
  },
  {
    id: "cat-non",
    label: "NON-COFFEE",
  },
];

const PRODUCTS_PER_COLUMN = 6;

export default function FeaturedMenu() {
  const [catIdx, setCatIdx] = useState(0);
  const [prodIdx, setProdIdx] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reduceMotion = useReducedMotion() ?? false;

  const category = CATEGORY_MAP[catIdx];

  // ponytail: abort-on-change keeps a fast category switch from rendering the
  // previous category's response. Raise the ceiling with React `use` + Suspense
  // when the whole homepage moves to server components.
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/products?category=${category.id}`,
          { signal: controller.signal },
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = (await res.json()) as { data?: Product[] };

        if (!Array.isArray(json?.data)) {
          throw new Error("unexpected response shape");
        }

        // API already filters by category and orders by displayOrder.
        // Status is not a server filter yet, so keep it client-side.
        setProducts(
          json.data.filter((p) => p.status === "ACTIVE"),
        );
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setError("Menu gagal dimuat.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => controller.abort();
  }, [category.id]);

  const product = products[prodIdx] ?? products[0];

  const status = loading
    ? "Memuat menu"
    : error ?? "Menu belum tersedia.";

  const switchCategory = (index: number) => {
    if (index === catIdx) {
      return;
    }

    setCatIdx(index);
    setProdIdx(0);
  };

  const selectProduct = (index: number) => {
    if (index === prodIdx) {
      return;
    }

    setProdIdx(index);
  };

  const revealOffset = reduceMotion ? 0 : 18;

  return (
    <section
      id="menu"
      className="bg-cream-dark text-navy"
    >
      <div className="section-shell">
        {/* =====================================================
            MENU HEADER
        ====================================================== */}
        <Reveal>
          <div className="pb-10 pt-16 sm:pb-12 sm:pt-20 lg:pb-14 lg:pt-24">
            <motion.p
              initial={{
                opacity: 0,
                y: revealOffset,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                amount: 0.2,
              }}
              transition={{
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="eyebrow"
            >
              Menu
            </motion.p>

            <motion.h2
              initial={{
                opacity: 0,
                y: reduceMotion ? 0 : 22,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                amount: 0.2,
              }}
              transition={{
                duration: 0.7,
                delay: reduceMotion ? 0 : 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-4 max-w-3xl font-display text-3xl leading-[1.02] sm:text-4xl md:text-5xl lg:text-6xl"
            >
              Kopi dan makanan untuk bersantai.
            </motion.h2>
          </div>
        </Reveal>

        {/* =====================================================
            MENU COMPOSITION
        ====================================================== */}
        <div className="grid w-full items-stretch overflow-hidden md:grid-cols-2">
          {/* ===================================================
              LEFT: PRODUCT IMAGE
          ==================================================== */}
          <motion.div
            initial={{
              opacity: 0,
              y: reduceMotion ? 0 : 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.15,
            }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative aspect-[4/5] w-full overflow-hidden bg-navy"
          >
            {product ? (
              <>
                {/* =================================================
                    PRODUCT IMAGE
                ================================================== */}
                <AnimatePresence
                  mode="wait"
                  initial={false}
                >
                  <motion.div
                    key={[
                      category.id,
                      product.productId,
                      product.imageUrl,
                    ].join(":")}
                    className="absolute inset-0"
                    initial={
                      reduceMotion
                        ? { opacity: 1 }
                        : {
                            opacity: 0,
                            scale: 1.025,
                          }
                    }
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                    }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.45,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <Image
                      key={[
                        category.id,
                        product.productId,
                        product.imageUrl,
                      ].join(":")}
                      src={
                        product.imageUrl ??
                        "/images/menu-placeholder.svg"
                      }
                      alt={product.name}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                      priority
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Image overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-navy/25 via-transparent to-navy/20" />

                {/* =================================================
                    IMAGE COPY
                    Mobile only
                ================================================== */}
                <motion.div
                  initial={{
                    opacity: 0,
                    y: reduceMotion ? 0 : 16,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                    amount: 0.2,
                  }}
                  transition={{
                    duration: 0.7,
                    delay: reduceMotion ? 0 : 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="absolute left-6 top-8 z-10 text-cream sm:left-10 sm:top-10 md:hidden"
                >
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.35em]">
                    Raccoon Coffee
                  </p>

                  <h3 className="max-w-[calc(100vw-3rem)] font-display text-3xl leading-[0.95] sm:max-w-md sm:text-4xl">
                    Coffee and Chill.
                  </h3>
                </motion.div>

                {/* =================================================
                    ACTIVE PRODUCT DESCRIPTION
                    Floating at bottom-left of image.
                ================================================== */}
                <AnimatePresence
                  mode="wait"
                  initial={false}
                >
                  <motion.div
                    key={`description-${product.productId}`}
                    initial={{
                      opacity: 0,
                      y: reduceMotion ? 0 : 8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: reduceMotion ? 0 : -8,
                    }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="absolute bottom-[82px] left-5 z-10 max-w-[240px] text-xs leading-relaxed text-cream sm:bottom-[90px] sm:left-8 sm:max-w-[280px] sm:text-sm"
                  >
                    {product.description}
                  </motion.div>
                </AnimatePresence>

                {/* =================================================
                    SELECTED PRODUCT INFO BAR
                ================================================== */}
                <motion.div
                  initial={{
                    opacity: 0,
                    y: reduceMotion ? 0 : 16,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                    amount: 0.2,
                  }}
                  transition={{
                    duration: 0.7,
                    delay: reduceMotion ? 0 : 0.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="absolute bottom-0 left-0 right-0 z-20 bg-cream/95 text-navy backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between gap-6 px-5 py-4 sm:px-8 sm:py-5">
                    <div className="min-w-0">
                      <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-navy/45">
                        Pilihan
                      </p>

                      <AnimatePresence
                        mode="wait"
                        initial={false}
                      >
                        <motion.p
                          key={product.productId}
                          initial={{
                            opacity: 0,
                            y: reduceMotion ? 0 : 8,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          exit={{
                            opacity: 0,
                            y: reduceMotion ? 0 : -8,
                          }}
                          transition={{
                            duration: reduceMotion ? 0 : 0.25,
                          }}
                          className="mt-1 truncate font-display text-base sm:text-lg"
                        >
                          {product.name}
                        </motion.p>
                      </AnimatePresence>
                    </div>

                    <AnimatePresence
                      mode="wait"
                      initial={false}
                    >
                      <motion.span
                        key={product.productId}
                        initial={{
                          opacity: 0,
                          y: reduceMotion ? 0 : 6,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        exit={{
                          opacity: 0,
                          y: reduceMotion ? 0 : -6,
                        }}
                        transition={{
                          duration: reduceMotion ? 0 : 0.25,
                        }}
                        className="shrink-0 font-display text-base sm:text-lg"
                      >
                        Rp {Number(product.price).toLocaleString("id-ID")}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </motion.div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs uppercase tracking-[0.22em] text-cream/70" role="status">
                {status}
              </div>
            )}
          </motion.div>

          {/* ===================================================
              RIGHT: MENU NAVIGATION
          ==================================================== */}
          <motion.div
            initial={{
              opacity: 0,
              y: reduceMotion ? 0 : 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.15,
            }}
            transition={{
              duration: 0.7,
              delay: reduceMotion ? 0 : 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex min-h-0 flex-col bg-cream px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12 xl:px-16"
          >
            {/* Menu label */}
            <motion.p
              initial={{
                opacity: 0,
                y: reduceMotion ? 0 : 10,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                amount: 0.2,
              }}
              transition={{
                duration: 0.5,
                delay: reduceMotion ? 0 : 0.12,
              }}
              className="eyebrow"
            >
              Menu
            </motion.p>

            {/* =================================================
                CATEGORY NAVIGATION
            ================================================== */}
            <motion.nav
              aria-label="Kategori menu"
              initial={{
                opacity: 0,
                y: reduceMotion ? 0 : 10,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                amount: 0.2,
              }}
              transition={{
                duration: 0.5,
                delay: reduceMotion ? 0 : 0.18,
              }}
              className="mt-5 flex gap-6 overflow-x-auto text-sm font-medium"
            >
              {CATEGORY_MAP.map((c, index) => {
                const active = index === catIdx;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => switchCategory(index)}
                    className={`relative shrink-0 pb-1 transition-colors ${
                      active
                        ? "text-navy"
                        : "text-navy/45 hover:text-navy"
                    }`}
                  >
                    {c.label}

                    {active && (
                      <motion.span
                        layoutId="active-category"
                        className="absolute inset-x-0 bottom-0 h-px bg-navy"
                        transition={{
                          duration: 0.3,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </motion.nav>

            {/* =================================================
                PRODUCT LIST

                First 6 products fill the first column.
                Product 7+ automatically continue in the
                next column.
            ================================================== */}
            <ul
              className="
                mt-8
                grid
                flex-1
                grid-flow-col
                grid-rows-[repeat(6,minmax(0,1fr))]
                auto-cols-fr
              "
            >
              {products.length > 0 ? (
                products.map((p, index) => {
                  const active = index === prodIdx;

                  return (
                    <motion.li
                      key={`${category.id}-${p.productId}`}
                      initial={{
                        opacity: 0,
                        y: reduceMotion ? 0 : 14,
                      }}
                      whileInView={{
                        opacity: 1,
                        y: 0,
                      }}
                      viewport={{
                        once: true,
                        amount: 0.15,
                      }}
                      transition={{
                        duration: reduceMotion ? 0.3 : 0.5,
                        delay: reduceMotion
                          ? 0
                          : 0.22 + index * 0.05,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="min-w-0"
                    >
                      <button
                        type="button"
                        onClick={() => selectProduct(index)}
                        className="group flex h-full w-full flex-col justify-center text-left"
                      >
                        {/* Product name */}
                        <span className="flex items-baseline gap-4">
                          <span className="w-6 shrink-0 text-[10px] tabular-nums text-navy/30">
                            {(index + 1)
                              .toString()
                              .padStart(2, "0")}
                          </span>

                          <span
                            className={`font-display leading-none transition-all duration-300 ${
                              active
                                ? "text-2xl text-navy sm:text-3xl"
                                : "text-lg text-navy/45 group-hover:text-navy/75 sm:text-xl"
                            }`}
                          >
                            {p.name}
                          </span>
                        </span>

                        {/* Active indicator */}
                        <motion.span
                          initial={false}
                          animate={{
                            opacity: active ? 1 : 0,
                            width: active ? "100%" : "0%",
                          }}
                          transition={{
                            duration: 0.3,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="ml-10 mt-3 h-px max-w-[220px] bg-navy/35"
                        />
                      </button>
                    </motion.li>
                  );
                })
              ) : (
                <li className="col-span-full flex items-center justify-center py-12 text-xs uppercase tracking-[0.22em] text-navy/40" role="status">
                  {status}
                </li>
              )}
            </ul>
          </motion.div>
        </div>

        {/* Bottom breathing space */}
        <div className="h-16 sm:h-20 lg:h-24" />
      </div>
    </section>
  );
}