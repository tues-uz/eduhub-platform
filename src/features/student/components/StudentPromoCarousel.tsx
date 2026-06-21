import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "@/lib/icons";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useActiveStudentPromos } from "@/features/promos/useStudentPromos";
import type { StudentPromo, StudentPromoPlacement } from "@/features/promos/studentPromos";

type StudentPromoCarouselProps = {
  placement: StudentPromoPlacement;
  className?: string;
  /** Break out of parent horizontal padding to span the full main column. */
  fullWidth?: boolean;
};

const PROMO_SCRIM =
  "linear-gradient(90deg, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.52) 42%, rgba(0, 0, 0, 0.15) 72%, transparent 100%)";

function PromoSlide({ promo }: { promo: StudentPromo }) {
  const { t } = useTranslation();
  const hasImage = promo.imageUrl.trim().length > 0;
  const isExternal = /^https?:\/\//i.test(promo.ctaUrl);

  const cta = (
    <Button
      size="sm"
      className="mt-3 w-fit rounded-full bg-white px-4 text-sm font-medium text-slate-900 hover:bg-white/90"
      asChild
    >
      {isExternal ? (
        <a href={promo.ctaUrl} target="_blank" rel="noopener noreferrer">
          {promo.ctaLabel}
        </a>
      ) : (
        <Link to={promo.ctaUrl}>{promo.ctaLabel}</Link>
      )}
    </Button>
  );

  return (
    <div className="relative flex h-64 overflow-hidden bg-black sm:h-80">
      {hasImage ? (
        <img src={promo.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div className="absolute inset-0" style={{ background: PROMO_SCRIM }} aria-hidden />
      <div className="relative z-10 mx-auto flex min-w-0 w-full max-w-none flex-1 flex-col justify-end px-8 pb-16 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{t("promo.label")}</p>
        <h2 className="mt-1 line-clamp-2 min-h-[2lh] max-w-[11rem] text-2xl font-bold leading-tight text-white sm:max-w-xs sm:text-3xl">
          {promo.title}
        </h2>
        <p className="mt-1 line-clamp-2 max-w-xl text-sm text-white/90">{promo.body}</p>
        {cta}
      </div>
    </div>
  );
}

export function StudentPromoCarousel({ placement, className, fullWidth = false }: StudentPromoCarouselProps) {
  const promos = useActiveStudentPromos(placement);
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return;
    setSelectedIndex(carouselApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  useEffect(() => {
    if (!api || promos.length <= 1) return;
    const timer = window.setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [api, promos.length]);

  if (promos.length === 0) return null;

  const showControls = promos.length > 1;

  return (
    <section
      className={cn("w-full", fullWidth && "-mx-6 -mt-4 w-[calc(100%+3rem)]", className)}
      aria-label={t("promo.ariaLabel")}
    >
      <Carousel setApi={setApi} opts={{ loop: showControls, align: "start" }} className="relative w-full">
        <CarouselContent className="-ml-0">
          {promos.map((promo) => (
            <CarouselItem key={promo.id} className="basis-full pl-0">
              <PromoSlide promo={promo} />
            </CarouselItem>
          ))}
        </CarouselContent>

        {showControls ? (
          <div className="absolute inset-x-0 bottom-4 z-20 flex w-full items-center justify-between px-8">
            <div className="flex items-center gap-1.5">
              {promos.map((promo, index) => (
                <button
                  key={promo.id}
                  type="button"
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    index === selectedIndex ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80",
                  )}
                  onClick={() => api?.scrollTo(index)}
                  aria-label={t("promo.goToPromotion", { index: index + 1 })}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-white/20 bg-white/45 text-slate-700 backdrop-blur-sm hover:bg-white/70 hover:text-slate-700 [&_svg]:opacity-100"
                onClick={() => api?.scrollPrev()}
                aria-label={t("promo.previous")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-white/20 bg-white/45 text-slate-700 backdrop-blur-sm hover:bg-white/70 hover:text-slate-700 [&_svg]:opacity-100"
                onClick={() => api?.scrollNext()}
                aria-label={t("promo.next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </Carousel>
    </section>
  );
}
