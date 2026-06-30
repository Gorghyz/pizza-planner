import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PizzaPhotoGallery from "@/components/pizza-photo-gallery";
import type { PizzaGalleryImage } from "@/components/pizza-photo-gallery";
import PublicCarteBuilder from "@/components/public-carte-builder";
import PublicSiteShell from "@/components/public-site-shell";
import {
  getPublishedBusinessEventBySlug,
  isBusinessEventOrderingOpen,
} from "@/lib/events";
import { formatDateTimeForDisplay } from "@/lib/dates";

export const dynamic = "force-dynamic";

const SITE_URL = "https://atabletonton.fr";

type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function getEventImages(eventTitle: string, images: { imagePath: string; altText: string }[]): PizzaGalleryImage[] {
  return images.map((image) => ({
    src: image.imagePath,
    alt: image.altText || eventTitle,
  }));
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedBusinessEventBySlug(slug);

  if (!event) {
    return {
      title: "Événement introuvable",
    };
  }

  const description =
    event.description ||
    `Ouverture spéciale À table tonton ! le ${event.serviceDateLabel}.`;

  return {
    title: `${event.title} — événement pizzas`,
    description,
    alternates: {
      canonical: `/evenements/${event.slug}`,
    },
    openGraph: {
      title: `${event.title} — À table tonton !`,
      description,
      url: `/evenements/${event.slug}`,
      type: "website",
      images: event.images[0]
        ? [
            {
              url: event.images[0].imagePath,
              alt: event.images[0].altText || event.title,
            },
          ]
        : undefined,
    },
  };
}

function buildOpenStreetMapUrl(latitude: number | null, longitude: number | null): string | null {
  if (latitude === null || longitude === null) {
    return null;
  }

  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
}

function buildEventStructuredData(event: Awaited<ReturnType<typeof getPublishedBusinessEventBySlug>>) {
  if (!event) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FoodEvent",
    "@id": `${SITE_URL}/evenements/${event.slug}#event`,
    name: event.title,
    description: event.description || undefined,
    startDate: `${event.serviceDate}T${event.opensAt}:00+02:00`,
    endDate: `${event.serviceDate}T${event.closesAt}:00+02:00`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    image: event.images.map((image) => `${SITE_URL}${image.imagePath}`),
    location: {
      "@type": "Place",
      name: event.locationName || event.city || "À table tonton !",
      address: [event.address, event.city].filter(Boolean).join(", ") || undefined,
      geo:
        event.latitude !== null && event.longitude !== null
          ? {
              "@type": "GeoCoordinates",
              latitude: event.latitude,
              longitude: event.longitude,
            }
          : undefined,
    },
    organizer: {
      "@type": "Organization",
      name: "À table tonton !",
      url: SITE_URL,
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getPublishedBusinessEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const orderingOpen = isBusinessEventOrderingOpen(event);
  const eventStructuredData = buildEventStructuredData(event);
  const mapUrl = buildOpenStreetMapUrl(event.latitude, event.longitude);
  const imageSlides = getEventImages(event.title, event.images);
  const closedMessage = event.orderOpensAt
    ? `Les précommandes ouvriront le ${formatDateTimeForDisplay(event.orderOpensAt)}.`
    : "Les précommandes ne sont pas ouvertes pour le moment.";

  return (
    <PublicSiteShell currentPage="carte">
      {eventStructuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(eventStructuredData),
          }}
        />
      ) : null}

      <section className="att-event-hero" aria-labelledby="event-title">
        <div className="att-event-gallery-card">
          <PizzaPhotoGallery pizzaName={event.title} images={imageSlides} />
        </div>

        <div className="att-event-hero-copy">
          <p className="att-event-kicker">Ouverture spéciale</p>
          <h1 id="event-title">{event.title}</h1>

          <div className="att-event-meta-list">
            <span>{event.serviceDateLabel}</span>
            <span>
              {event.opensAt} → {event.closesAt}
            </span>
            <span>{event.locationName || event.city || "Lieu à préciser"}</span>
            {mapUrl ? (
              <a
                className="att-event-map-button"
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Voir sur la carte
              </a>
            ) : null}
          </div>

          {event.address || event.city ? (
            <p className="att-event-address">
              {[event.address, event.city].filter(Boolean).join(" — ")}
            </p>
          ) : null}

          {event.description ? (
            <div className="att-event-description">{event.description}</div>
          ) : null}

          {event.publicNote ? (
            <div className="att-event-public-note">{event.publicNote}</div>
          ) : null}

          <div className={orderingOpen ? "att-event-order-open" : "att-event-order-closed"}>
            {orderingOpen
              ? "Les précommandes sont ouvertes pour cette date."
              : closedMessage}
          </div>
        </div>
      </section>

      <PublicCarteBuilder
        pizzas={event.pizzas}
        orderContext={{
          eventSlug: event.slug,
          eventTitle: event.title,
          serviceDate: event.serviceDate,
          serviceDateLabel: event.serviceDateLabel,
          orderingAllowed: orderingOpen,
          orderingClosedMessage: closedMessage,
          introNote:
            "Cette page sert à préparer une précommande pour l’événement uniquement. Nous confirmerons le créneau par SMS.",
          submitSuccessMessage:
            "Votre précommande a été enregistrée. Nous reviendrons vers vous par SMS pour confirmer le créneau.",
        }}
      />
    </PublicSiteShell>
  );
}
