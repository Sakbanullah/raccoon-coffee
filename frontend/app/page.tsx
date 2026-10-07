import Hero from "../components/home/Hero";
import BrandIntro from "../components/home/BrandIntro";
import FeaturedMenu from "../components/home/FeaturedMenu";
import StorySection from "../components/home/StorySection";
import Atmosphere from "../components/home/Atmosphere";
import EventsPreview from "../components/home/EventsPreview";
import RaccoonWallPreview from "../components/home/RaccoonWallPreview";
import LocationSection from "../components/home/LocationSection";
import Footer from "../components/home/Footer";
import Navbar from "../components/navigation/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="bg-cream">
        <Hero />
        <BrandIntro />
        <FeaturedMenu />
        <StorySection />
        <Atmosphere />
        <EventsPreview />
        <RaccoonWallPreview />
        <LocationSection />
        <Footer />
      </main>
    </>
  );
}
