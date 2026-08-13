import { useState } from "react";

/** Same campus/class visuals as Available Classes cards (skip IELTS registration room). */
const HERO_GALLERY_IMAGES = [
  { src: "/eduhub/blog/bloomberg-lab-classroom.png", alt: "Students in the Bloomberg Lab classroom" },
  { src: "/eduhub/blog/bloomberg-lab.png", alt: "Bloomberg Lab learning session at EduHub" },
  { src: "/eduhub/blog/awarding-day-group.png", alt: "Awarding day group photo at EduHub" },
  { src: "/eduhub/blog/bloomberg-lab-certificates.png", alt: "Students receiving Bloomberg Lab certificates" },
  { src: "/eduhub/blog/awarding-day-certificate.png", alt: "Student receiving a certificate on awarding day" },
  { src: "/eduhub/vision-community.png", alt: "EduHub learning community" },
  { src: "/eduhub/hero/1.png", alt: "Students learning together at a round table in the EduHub classroom" },
  { src: "/eduhub/hero/2.png", alt: "EduHub students and teachers group photo with EDU HUB logo" },
  { src: "/eduhub/hero/3.png", alt: "Students studying English around a table with interactive display" },
  { src: "/eduhub/hero/4.png", alt: "Class group photo in front of Today a Reader Tomorrow a Leader wall" },
] as const;

type GalleryImage = (typeof HERO_GALLERY_IMAGES)[number];

function shuffleImages(images: readonly GalleryImage[]): GalleryImage[] {
  const next = [...images];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function HeroInfiniteScrollGallery() {
  const [orderedImages] = useState(() => shuffleImages(HERO_GALLERY_IMAGES));
  const duplicatedImages = [...orderedImages, ...orderedImages];

  return (
    <div
      className="hero-cards-reveal w-full min-w-0 max-w-7xl mx-auto overflow-hidden flex items-center"
      style={{ height: "380px" }}
    >
      <div
        className="hero-gallery-mask w-full min-w-0 overflow-hidden"
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
              className="hero-gallery-item flex-shrink-0 w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 rounded-xl overflow-hidden"
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
