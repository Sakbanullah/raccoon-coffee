const STEPS = [
  {
    n: "01",
    label: "BERHENTI",
    title: "Berhenti Sebentar",
    copy: "Simpan dulu daftar urusanmu di luar pintu.",
    // Points sit on the quadratic arc drawn below (t = 0.2, 0.5, 0.8).
    x: 216,
    y: 153,
  },
  {
    n: "02",
    label: "SERUPUT",
    title: "Seruput Pelan-pelan",
    copy: "Kopi hangat, napas panjang, obrolan yang tidak diburu.",
    x: 450,
    y: 115,
  },
  {
    n: "03",
    label: "KEMBALI",
    title: "Kembali Lagi",
    copy: "Kedai ini tetap di sini besok, dengan lampu yang sama.",
    x: 684,
    y: 153,
  },
];

export default function RitualArc() {
  return (
    <section className="bg-cream py-20 text-ink sm:py-24">
      <div className="section-shell">
        <p className="eyebrow text-center">
          <span aria-hidden="true" className="mr-2 text-gold">•</span>
          Ritual Kecil
        </p>
        <h2 className="mx-auto mt-4 max-w-xl text-center font-display text-3xl leading-snug sm:text-4xl">
          Jalanmu menuju momen yang <em className="italic text-coffee">lebih pelan.</em>
        </h2>

        {/* Curved journey arc, echoing the reference's numbered path diagram.
            Hidden on mobile: the viewBox downscale makes its labels unreadable;
            the stacked step cards below carry the same content. */}
        <svg
          viewBox="0 0 900 250"
          className="mx-auto mt-10 hidden w-full max-w-3xl sm:block"
          role="img"
          aria-label="Tiga langkah ritual Raccoon: Berhenti, Seruput, Kembali"
        >
          <path
            d="M 60 220 Q 450 10 840 220"
            fill="none"
            stroke="#483827"
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />
          {STEPS.map((s, i) => (
            <g key={s.n}>
              <circle
                cx={s.x}
                cy={s.y}
                r="21"
                fill={i === 0 ? "#10382D" : "#F4EBDD"}
                stroke="#10382D"
                strokeWidth="1.5"
              />
              <text
                x={s.x}
                y={s.y + 5}
                textAnchor="middle"
                fontSize="15"
                fontFamily="Georgia, serif"
                fill={i === 0 ? "#F4EBDD" : "#10382D"}
              >
                {i + 1}
              </text>
              <text
                x={s.x}
                y={s.y - 34}
                textAnchor="middle"
                fontSize="12"
                letterSpacing="3"
                fontFamily="system-ui, sans-serif"
                fill="#483827"
              >
                {s.label}
              </text>
            </g>
          ))}
        </svg>

        <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
                Step {s.n}
              </p>
              <h3 className="mt-2 font-display text-xl text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{s.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
