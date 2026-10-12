"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Story } from "../../types";
import Reveal from "../ui/Reveal";

export default function StorySection() {
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/stories", {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = (await res.json()) as { data?: Story[] };

        if (Array.isArray(json?.data) && json.data.length > 0) {
          setStory(json.data[0]);
        } else {
          setStory(null);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setError("Gagal memuat cerita.");
          setStory(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => controller.abort();
  }, []);

  // Always render section; show fallback when no story
  const fallback = {
    title: "Tentang Raccoon",
    content: "Menyajikan berbagai pilihan minuman kopi, susu, non‑kopi, makanan, dan makanan penutup.",
    coverImageUrl: null as string | null,
  };
  const display = story ?? fallback;

  return (
    <section id="story" className="relative bg-cream py-20 text-ink sm:py-28 overflow-hidden">
      <div className="section-shell grid md:grid-cols-2 items-center gap-16">
        <Reveal className="md:col-span-1">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
            {loading ? (
              <div className="absolute inset-0 bg-forest/30 animate-pulse" />
            ) : display.coverImageUrl ? (
              <Image
                src={display.coverImageUrl}
                alt={display.title}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 bg-forest/30" />
            )}
          </div>
        </Reveal>
        <Reveal delay={0.1} className="md:col-span-1">
          <p className="eyebrow text-gold">Tentang Raccoon</p>
          {loading ? (
            <div className="mt-4 space-y-4">
              <div className="h-10 bg-forest/20 rounded animate-pulse w-3/4" />
              <div className="h-6 bg-forest/20 rounded animate-pulse w-full" />
              <div className="h-6 bg-forest/20 rounded animate-pulse w-5/6" />
            </div>
          ) : (
            <>
              <h2 className="mt-4 font-display text-4xl md:text-5xl text-ink">{display.title}</h2>
              <p className="mt-6 text-lg leading-relaxed text-ink/85">{display.content}</p>
              <p className="mt-4 text-lg leading-relaxed text-ink/85">Menyajikan berbagai pilihan minuman kopi, susu, non-kopi, makanan, dan makanan penutup.</p>
              <div className="mt-10">
                <a
                  href="#location"
                  className="group inline-flex items-center gap-3 border border-forest/40 bg-forest px-7 py-3.5 text-sm font-medium tracking-widest text-cream transition-colors hover:border-forest hover:bg-forest-deep hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                >
                  <span className="font-display text-base leading-none">KUNJUNGI KEDAI</span>
                  <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </a>
              </div>
            </>
          )}
        </Reveal>
      </div>
    </section>
  );
}
