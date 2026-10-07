export default function Footer() {
  return (
    <footer className="bg-navy text-cream py-12">
      <div className="section-shell grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <h3 className="font-display text-xl">Raccoon Coffee Baturaja</h3>
          <p className="mt-2 text-sm">Coffee and Chill</p>
        </div>
        <div>
          <h4 className="font-medium text-sm">Navigation</h4>
          <ul className="mt-2 space-y-1 text-sm">
            <li><a href="#" className="hover:underline">Home</a></li>
            <li><a href="#story" className="hover:underline">Story</a></li>
            <li><a href="#menu" className="hover:underline">Menu</a></li>
            <li><a href="#inside" className="hover:underline">Inside</a></li>
            <li><a href="#location" className="hover:underline">Location</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-sm">Contact</h4>
          <p className="mt-2 text-sm">Bakung, Baturaja</p>
          <p className="text-sm">Selasa–Minggu · 13.00–23.00</p>
          <div className="mt-2 flex gap-4">
            <a
              href="https://instagram.com/raccooncoffee.id"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Instagram @raccooncoffee.id
            </a>
          </div>
        </div>
      </div>
      <p className="mt-8 text-center text-xs opacity-70">© {new Date().getFullYear()} Raccoon Coffee Baturaja. All rights reserved.</p>
    </footer>
  );
}
