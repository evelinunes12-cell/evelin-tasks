import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface Banner {
  id: string;
  image_url: string;
  title: string | null;
  link_url: string | null;
}

const DashboardBannerCarousel = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const fetchBanners = async () => {
      const { data } = await supabase
        .from("system_banners")
        .select("id, image_url, title, link_url")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setBanners((data as Banner[]) || []);
    };
    fetchBanners();
  }, []);

  const startAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      api?.scrollNext();
    }, 5000);
  }, [api]);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);

    startAutoplay();

    return () => {
      api.off("select", onSelect);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [api, startAutoplay]);

  if (banners.length === 0) return null;

  const handleDotClick = (index: number) => {
    api?.scrollTo(index);
    startAutoplay();
  };

  const Wrapper = ({ banner, children }: { banner: Banner; children: React.ReactNode }) => {
    if (banner.link_url) {
      const isExternal = banner.link_url.startsWith("http");
      return (
        <a
          href={banner.link_url}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="block"
        >
          {children}
        </a>
      );
    }
    return <>{children}</>;
  };

  return (
    <div className="mb-6">
      <Carousel
        setApi={setApi}
        opts={{ loop: true }}
        className="w-full"
      >
        <CarouselContent>
          {banners.map(banner => (
            <CarouselItem key={banner.id}>
              <Wrapper banner={banner}>
                <div className="relative w-full overflow-hidden rounded-xl aspect-[2.5/1] md:aspect-[5/1]">
                  <img
                    src={banner.image_url}
                    alt={banner.title || "Banner"}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </Wrapper>
            </CarouselItem>
          ))}
        </CarouselContent>
        {banners.length > 1 && (
          <>
            <CarouselPrevious className="left-2 md:-left-12" />
            <CarouselNext className="right-2 md:-right-12" />
          </>
        )}
      </Carousel>

      {/* Dots */}
      {count > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => handleDotClick(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
              )}
              aria-label={`Ir para banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardBannerCarousel;
