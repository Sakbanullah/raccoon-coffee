"use client";

import { useEffect, useState } from "react";
import { Event } from "../../types";
import Reveal from "../ui/Reveal";

export default function EventsPreview() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch("/api/events", {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = (await res.json()) as { data?: Event[] };

        if (Array.isArray(json?.data)) {
          setEvents(json.data.filter((e) => e.status === "PUBLISHED"));
        }
      } catch {
        if (!controller.signal.aborted) {
          setEvents([]);
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return new Date(timeString).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timeString;
    }
  };

  return (
    <section id="events" className="bg-forest-deep py-20 text-cream sm:py-28 torn-bottom">
      <div className="section-shell">
        <Reveal>
          <h2 className="eyebrow text-center text-gold">What's On</h2>
        </Reveal>

        {loading ? (
          <Reveal delay={0.08} className="mt-10 text-center">
            <p className="text-base text-ink/75">Memuat acara...</p>
          </Reveal>
        ) : events.length === 0 ? (
          <Reveal delay={0.08} className="mt-10 text-center">
            <p className="text-base text-ink/75">
              Cek Instagram kami untuk update terbaru.
            </p>
            <a
              href="https://instagram.com/raccooncoffee.id"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 border border-forest/40 bg-forest px-7 py-3.5 text-sm font-medium tracking-widest text-cream transition-colors hover:border-forest hover:bg-forest-deep hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            >
              <span className="font-display text-base leading-none">FOLLOW US</span>
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </a>
          </Reveal>
        ) : (
          <ul className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event, i) => (
              <Reveal key={event.eventId} delay={i * 0.08} className={`bg-cream border border-forest/20 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${i === 0 ? 'md:col-span-2 lg:col-span-2' : ''}`}>
                <h3 className="font-display text-xl text-ink">{event.title}</h3>
                <p className="mt-2 text-sm text-ink/70">
                  {formatDate(event.eventDate)} {event.startTime && `at ${formatTime(event.startTime)}`}
                </p>
                <p className="mt-3 text-sm text-ink/80">{event.description}</p>
                <a
                  href="#"
                  className="mt-4 inline-block text-sm font-medium text-gold underline underline-offset-2 hover:text-forest"
                >
                  Lebih lengkap
                </a>
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
