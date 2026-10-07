"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Story } from "../../types";
import Reveal from "../ui/Reveal";

export default function StorySection() {
  const [story, setStory] = useState<Story | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
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
        }
      } catch {
        if (!controller.signal.aborted) {
          setStory(null);
        }
      }
    };

    void load();

    return () => controller.abort();
  }, []);

  if (!story) {
    return null;
  }

  return (
    <section id="story" className="bg-cream py-20 text-navy sm:py-28">
      <div className="section-shell">
        <Reveal>
          <div className="grid gap-10 md:grid-cols-12 md:items-center md:gap-12">
            <div className="relative aspect-[4/3] overflow-hidden bg-navy/5 md:col-span-7">
              {story.coverImageUrl && (
                <Image
                  src={story.coverImageUrl}
                  alt={story.title}
                  fill
                  loading="lazy"
                  sizes="(min-width: 768px) 55vw, 100vw"
                  className="object-cover transition-transform duration-700 hover:scale-105"
                />
              )}
            </div>
            <div className="md:col-span-5 md:pl-6">
              <p className="eyebrow">Tentang Raccoon</p>
              <h2 className="mt-4 font-display text-3xl leading-[1.05] sm:text-4xl md:text-5xl">
                {story.title}
              </h2>
              <p className="mt-6 text-base leading-relaxed text-navy/75 sm:text-lg">
                {story.content}
              </p>
              <p className="mt-4 text-base leading-relaxed text-navy/75 sm:text-lg">
                Menyajikan berbagai pilihan minuman kopi, susu, non-kopi, makanan, dan makanan penutup.
              </p>
              <div className="mt-8">
                <a
                  href="#location"
                  className="inline-flex items-center gap-2 border border-navy/30 px-6 py-3 text-sm font-medium tracking-wide text-navy transition-colors hover:border-navy hover:bg-navy hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                >
                  Kunjungi Kedai
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
