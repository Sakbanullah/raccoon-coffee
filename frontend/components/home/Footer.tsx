"use client";

export default function Footer() {
  return (
    <footer className="bg-forest-deep text-cream py-16">
      <div className="section-shell grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h3 className="font-display text-xl text-cream">Raccoon Coffee Baturaja</h3>
          <p className="mt-2 text-sm text-cream/70">Coffee and Chill</p>
        </div>
        <div>
          <h4 className="font-medium text-xs uppercase tracking-[0.2em] text-gold">Navigation</h4>
          <ul className="mt-3 space-y-2 text-sm text-cream/80">
            <li><a href="#top" className="hover:text-gold transition-colors">Home</a></li>
            <li><a href="#story" className="hover:text-gold transition-colors">Story</a></li>
            <li><a href="#menu" className="hover:text-gold transition-colors">Menu</a></li>
            <li><a href="#atmosphere" className="hover:text-gold transition-colors">Atmosphere</a></li>
            <li><a href="#inside" className="hover:text-gold transition-colors">Raccoon Wall</a></li>
            <li><a href="#location" className="hover:text-gold transition-colors">Location</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-xs uppercase tracking-[0.2em] text-gold">Contact</h4>
          <p className="mt-3 text-sm text-cream/80">Bakung, Baturaja</p>
          <p className="text-sm text-cream/70">Setiap hari · 13.00 – 23.00</p>
          <div className="mt-4">
            <a
              href="https://instagram.com/raccooncoffee.id"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-gold hover:underline"
            >
              Instagram @raccooncoffee.id →
            </a>
          </div>
        </div>
        <div className="col-span-full pt-8 border-t border-cream/10 text-center text-xs text-cream/50">
          © {new Date().getFullYear()} Raccoon Coffee Baturaja. All rights reserved.
        </div>
      </div>
    </footer>
  );
}