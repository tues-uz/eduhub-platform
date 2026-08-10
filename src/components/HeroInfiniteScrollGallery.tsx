const HERO_GALLERY_IMAGES = [
  { src: "/eduhub/hero/1.png", alt: "Students learning together at a round table in the EduHub classroom" },
  { src: "/eduhub/hero/2.png", alt: "EduHub students and teachers group photo with EDU HUB logo" },
  { src: "/eduhub/hero/3.png", alt: "Students studying English around a table with interactive display" },
  { src: "/eduhub/hero/4.png", alt: "Class group photo in front of Today a Reader Tomorrow a Leader wall" },
] as const;

export function HeroInfiniteScrollGallery() {
  const duplicatedImages = [...HERO_GALLERY_IMAGES, ...HERO_GALLERY_IMAGES];

  return (
    <div
      className="hero-cards-reveal w-full max-w-7xl mx-auto overflow-hidden flex items-center"
      style={{ height: "380px" }}
    >
      <div
        className="hero-gallery-mask w-full"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        <div className="hero-gallery-scroll flex gap-6 w-max">
          {duplicatedImages.map((image, index) => (
            <div
              key={`${image.src}-${index}`}
              className="hero-gallery-item flex-shrink-0 w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 rounded-xl overflow-hidden shadow-2xl"
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
