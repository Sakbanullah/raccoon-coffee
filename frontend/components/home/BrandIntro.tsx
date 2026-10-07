import Reveal from "../ui/Reveal";

export default function BrandIntro() {
  return (
    <section id="brand" className="bg-cream py-20 text-navy sm:py-28">
      <div className="section-shell">
        <div className="grid gap-8 md:grid-cols-12 md:gap-12">
          <Reveal className="md:col-span-5">
            <p className="eyebrow">Raccoon Coffee Baturaja</p>
            <h2 className="mt-4 font-display text-3xl leading-[1.05] sm:text-4xl md:text-5xl">
              Coffee and Chill.
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="md:col-span-6 md:col-start-7">
            <p className="max-w-xl text-base leading-relaxed text-navy/75 sm:text-lg">
              Raccoon Coffee Baturaja adalah tempat untuk ngopi, makan, dan
              bersantai di Bakung, Baturaja.
            </p>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-navy/75 sm:text-lg">
              Buka Selasa–Minggu, 13.00–23.00.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
