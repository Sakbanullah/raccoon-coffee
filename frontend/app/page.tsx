import Hero from "../components/home/Hero";
import RitualArc from "../components/home/RitualArc";
import BrandIntro from "../components/home/BrandIntro";
import FeaturedMenu from "../components/home/FeaturedMenu";
import Atmosphere from "../components/home/Atmosphere";
import RaccoonWallPreview from "../components/home/RaccoonWallPreview";
import LocationSection from "../components/home/LocationSection";
import Footer from "../components/home/Footer";
import Navbar from "../components/navigation/Navbar";
import { getSiteImages } from "../lib/site-images";

export default async function Home() {
  // Fetch custom section images server-side so the first render already has
  // them, preventing the static-fallback flash the client hook caused.
  const [heroImages, brandStoryImages, atmosphereImages] = await Promise.all([
    getSiteImages("hero"),
    getSiteImages("brand_story"),
    getSiteImages("atmosphere"),
  ]);

  return (
    <>
      <Navbar />
      <main className="bg-cream">
        <Hero images={heroImages} />
        <RitualArc />
        <BrandIntro images={brandStoryImages} />
        <FeaturedMenu />
        <Atmosphere images={atmosphereImages} />
        <RaccoonWallPreview />
        <LocationSection />
        <Footer />
      </main>
    </>
  );
}
