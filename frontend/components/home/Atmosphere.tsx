import Image from "next/image";
import Reveal from "../ui/Reveal";

const ATMOSPHERE_IMAGES = [
  { src: "/images/raccoon/atmosphere/interior.jpg", alt: "Interior of Raccoon Coffee" },
  { src: "/images/raccoon/atmosphere/barista.jpg", alt: "Barista at work" },
  { src: "/images/raccoon/atmosphere/table.jpg", alt: "Table setting" },
  { src: "/images/raccoon/atmosphere/evening.jpg", alt: "Evening atmosphere" },
  { src: "/images/raccoon/atmosphere/counter.jpg", alt: "Counter area" },
  { src: "/images/raccoon/atmosphere/crowd.jpg", alt: "Crowded cafe" },
];

export default function Atmosphere() {
  return (
    <section id="atmosphere" className="bg-cream py-20 text-navy sm:py-28"
      >
      <div className="section-shell">
        <Reveal>
          <h2 className="eyebrow text-center">Atmosphere</h2>
        </Reveal>
        <Reveal className="mt-12">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-navy/5">
              <Image
                src={ATMOSPHERE_IMAGES[0].src}
                alt={ATMOSPHERE_IMAGES[0].alt}
                fill
                loading="lazy"
                className="object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
            <div className="flex flex-col justify-center space-y-4">
              <h3 className="text-2xl font-display">Warm, intimate, editorial.</h3>
              <p className="text-base leading-relaxed text-navy/75">
                Our space invites lingering conversations, soft lighting, and the gentle hum of espresso
                machines.
              </p>
              <a
                href="#location"
                className="inline-flex items-center gap-2 border border-navy/30 px-4 py-2 text-sm font-medium text-navy transition-colors hover:border-navy hover:bg-navy hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              >
                Explore the space
              </a>
            </div>
          </div>
        </Reveal>
        <Reveal className="mt-12">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {ATMOSPHERE_IMAGES.slice(1).map((img) => (
              <div key={img.src} className="relative aspect-square overflow-hidden rounded-lg bg-navy/5">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  loading="lazy"
                  className="object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
