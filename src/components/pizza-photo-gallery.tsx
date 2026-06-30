"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Lightbox from "yet-another-react-lightbox";

export type PizzaGalleryImage = {
  src: string;
  alt: string;
};

type PizzaPhotoGalleryProps = {
  pizzaName: string;
  images: PizzaGalleryImage[];
};

const AUTO_SCROLL_DELAY_MS = 6000;

export default function PizzaPhotoGallery({
  pizzaName,
  images,
}: PizzaPhotoGalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: images.length > 1,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const slides = useMemo(
    () => images.map((image) => ({ src: image.src, alt: image.alt })),
    [images],
  );

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) {
      return;
    }

    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || images.length <= 1 || lightboxIndex >= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.hidden) {
        return;
      }

      emblaApi.scrollNext();
    }, AUTO_SCROLL_DELAY_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [emblaApi, images.length, lightboxIndex]);

  if (images.length === 0) {
    return <div className="att-pizza-photo-placeholder" aria-hidden="true" />;
  }

  return (
    <div className="pizza-photo-gallery">
      <div className="pizza-photo-gallery-viewport" ref={emblaRef}>
        <div className="pizza-photo-gallery-container">
          {images.map((image, index) => (
            <button
              key={`${image.src}-${index}`}
              type="button"
              className="pizza-photo-gallery-slide"
              onClick={() => setLightboxIndex(index)}
              aria-label={`Agrandir la photo ${index + 1} de ${pizzaName}`}
            >
              <img src={image.src} alt={image.alt} className="att-pizza-photo" />
            </button>
          ))}
        </div>
      </div>

      {images.length > 1 ? (
        <>
          <button
            type="button"
            className="pizza-photo-gallery-arrow pizza-photo-gallery-arrow-prev"
            onClick={scrollPrev}
            aria-label={`Photo précédente de ${pizzaName}`}
          >
            ‹
          </button>

          <button
            type="button"
            className="pizza-photo-gallery-arrow pizza-photo-gallery-arrow-next"
            onClick={scrollNext}
            aria-label={`Photo suivante de ${pizzaName}`}
          >
            ›
          </button>

          <div className="pizza-photo-gallery-dots" aria-label="Photos disponibles">
            {images.map((image, index) => (
              <button
                key={`${image.src}-dot-${index}`}
                type="button"
                className={
                  selectedIndex === index
                    ? "pizza-photo-gallery-dot pizza-photo-gallery-dot-active"
                    : "pizza-photo-gallery-dot"
                }
                onClick={() => emblaApi?.scrollTo(index)}
                aria-label={`Afficher la photo ${index + 1} de ${pizzaName}`}
              />
            ))}
          </div>
        </>
      ) : null}

      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={Math.max(lightboxIndex, 0)}
        slides={slides}
      />
    </div>
  );
}