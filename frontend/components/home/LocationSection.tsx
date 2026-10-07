import { MOCK_BRANCHES } from "../../lib/mock-data";
import Reveal from "../ui/Reveal";

export default function LocationSection() {
  const branch = MOCK_BRANCHES[0];
  return (
    <section id="location" className="bg-cream py-20 text-navy sm:py-28">
      <div className="section-shell">
        <Reveal>
          <h2 className="eyebrow text-center">Find Us</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div className="md:col-span-1">
              <h3 className="font-display text-2xl">{branch.name}</h3>
              <p>{branch.address}, {branch.city}</p>
              {branch.openingTime && branch.closingTime && (
                <p className="mt-2 text-sm">Selasa–Minggu · {branch.openingTime} – {branch.closingTime}</p>
              )}
              <a
                href={branch.mapsUrl ?? "#"}
                className="mt-4 inline-block border border-coffee px-5 py-2 text-sm font-medium text-coffee transition-colors hover:bg-coffee hover:text-cream"
              >
                Get Directions
              </a>
            </div>
            <div className="md:col-span-1 flex items-center justify-center bg-navy/5">
              <span className="text-sm text-navy/50">Bakung, Baturaja</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
