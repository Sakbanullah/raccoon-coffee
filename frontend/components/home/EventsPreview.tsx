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
    <section id="events" className="bg-cream py-20 text-navy sm:py-28">
      <div className="section-shell">
        <Reveal>
          <h2 className="eyebrow text-center">What’s On</h2>
        </Reveal>

        {loading ? (
          <Reveal delay={0.08} className="mt-10 text-center">
            <p className="text-base text-navy/75">Memuat acara...</p>
          </Reveal>
        ) : events.length === 0 ? (
          <Reveal delay={0.08} className="mt-10 text-center">
            <p className="text-base text-navy/75">
              Cek Instagram kami untuk update terbaru.
            </p>
            <a
              href="https://instagram.com/raccooncoffee.id"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 border border-navy/30 px-6 py-3 text-sm font-medium tracking-wide text-navy transition-colors hover:border-navy hover:bg-navy hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              Follow us on Instagram
            </a>
          </Reveal>
        ) : (
          <ul className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event, i) => (
              <Reveal key={event.eventId} delay={i * 0.08} className="bg-cream-dark rounded-lg p-6 shadow-sm">
                <h3 className="font-display text-xl">{event.title}</h3>
                <p className="mt-2 text-sm text-navy/70">
                  {formatDate(event.eventDate)} {event.startTime && `at ${formatTime(event.startTime)}`}
                </p>
                <p className="mt-3 text-sm text-navy/80">{event.description}</p>
                <a
                  href="#"
                  className="mt-4 inline-block text-sm font-medium text-coffee underline underline-offset-2 hover:text-navy"
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
