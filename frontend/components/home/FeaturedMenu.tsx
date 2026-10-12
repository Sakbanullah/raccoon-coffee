"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Product } from "../../types";
import Reveal from "../ui/Reveal";

export default function FeaturedMenu() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reduceMotion = useReducedMotion() ?? false;

  // Load first 4 active coffee products (default category)
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/products?category=cat-coffee`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data?: Product[] };
        const items = json?.data?.filter((p) => p.status === "ACTIVE") ?? [];
        setProducts(items.slice(0, 4));
      } catch (e) {
        if (!controller.signal.aborted) setError("Menu gagal dimuat.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const revealOffset = reduceMotion ? 0 : 18;

  return (
    <section id="menu" className="bg-forest-deep text-cream py-20">
      <div className="section-shell">
        <Reveal>
          <div className="text-center">
            <motion.p
              initial={{ opacity: 0, y: revealOffset }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="eyebrow text-gold"
            >
              Today's Favorites
            </motion.p>
            <motion.h2
              className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              Kopi dan makanan untuk bersantai.
            </motion.h2>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <p className="col-span-full text-center">Memuat menu…</p>
          ) : error ? (
            <p className="col-span-full text-center text-red-400">{error}</p>
          ) : (
            products.map((p) => (
              <motion.article
                key={p.productId}
                className="bg-cream/90 text-navy rounded-lg overflow-hidden shadow-md"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image
                  src={p.imageUrl ?? "/images/menu-placeholder.svg"}
                  alt={p.name}
                  width={300}
                  height={200}
                  className="object-cover w-full h-48"
                />
                <div className="p-4">
                  <h3 className="font-display text-lg">{p.name}</h3>
                  <p className="mt-1 text-sm text-navy/70">{p.description}</p>
                  <p className="mt-2 font-semibold text-base">Rp {Number(p.price).toLocaleString("id-ID")}</p>
                </div>
              </motion.article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
