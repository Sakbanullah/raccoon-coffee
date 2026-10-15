import Link from "next/link";

export default function RaccoonWallTerms() {
  return (
    <section className="bg-cream py-16 text-ink sm:py-20">
      <article className="mx-auto max-w-2xl px-6">
        <p className="eyebrow text-gold">Raccoon Wall</p>
        <h1 className="mt-4 font-display text-3xl leading-[1.1] sm:text-4xl">
          Ketentuan Publikasi Foto Raccoon Wall
        </h1>

        <div className="mt-10 space-y-8">
          <section>
            <h2 className="font-display text-xl">1. Tentang Raccoon Wall</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              Raccoon Wall adalah tempat untuk menampilkan foto yang dikirimkan oleh pengunjung Raccoon
              Coffee. Foto yang kamu kirimkan akan ditinjau terlebih dahulu sebelum ditampilkan di website.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">2. Hak atas Foto</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              Kamu harus memastikan bahwa foto yang diunggah merupakan milikmu atau kamu memiliki izin
              untuk menggunakannya. Kepemilikan foto tetap menjadi milikmu dan tidak berpindah ke Raccoon
              Coffee.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">3. Penggunaan Foto</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              Dengan mengirimkan foto, kamu mengizinkan Raccoon Coffee untuk menampilkan foto yang disetujui
              di website Raccoon Wall dan menggunakannya untuk promosi brand Raccoon Coffee.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">4. Peninjauan Foto</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              Raccoon Coffee berhak menyetujui atau menolak foto yang dikirimkan. Foto yang telah
              ditampilkan juga dapat dihapus jika dianggap tidak sesuai.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">5. Tanggung Jawab</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              Kamu bertanggung jawab memastikan bahwa foto yang dikirimkan tidak melanggar hak orang lain
              atau ketentuan yang berlaku.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">6. Persetujuan</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              Dengan mencentang kotak persetujuan pada formulir unggah, kamu menyatakan bahwa kamu memahami
              dan menyetujui ketentuan publikasi foto ini.
            </p>
          </section>
        </div>

        <Link href="/" className="mt-12 inline-block py-2 text-sm font-medium text-forest underline underline-offset-4">
          Kembali ke Beranda
        </Link>
      </article>
    </section>
  );
}