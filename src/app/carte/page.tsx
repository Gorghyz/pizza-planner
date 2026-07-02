import type { CSSProperties } from "react";
import type { Metadata } from "next";

import Link from "next/link";

import PublicCarteBuilder from "@/components/public-carte-builder";
import PublicSiteShell from "@/components/public-site-shell";
import { getActivePizzas } from "@/lib/data";
import { getVisiblePublishedEvents } from "@/lib/events";
import type { Pizza } from "@/lib/types";

export const dynamic = "force-dynamic";

const SITE_URL = "https://atabletonton.fr";

export const metadata: Metadata = {
  title: "Carte et commande de pizzas à Marval",
  description:
    "Retrouvez la carte d’À table tonton ! : pizzas à emporter à Marval, recettes gourmandes et originales, créneau souhaité et demande de commande simple.",
  alternates: {
    canonical: "/carte",
  },
  openGraph: {
    title: "Carte et commande de pizzas à Marval — À table tonton !",
    description:
      "Choisissez vos pizzas, indiquez votre créneau souhaité et préparez votre demande simplement.",
    url: "/carte",
    type: "website",
  },
};


function getCalloutImageStyle(index: number, imageCount: number): CSSProperties {
  if (imageCount <= 1) {
    return {};
  }

  return {
    animationDelay: `${index * 4}s`,
    animationDuration: `${imageCount * 4}s`,
  };
}

function buildMenuStructuredData(pizzas: Pizza[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${SITE_URL}/carte#menu`,
    name: "Carte de pizzas à Marval — À table tonton !",
    url: `${SITE_URL}/carte`,
    provider: {
      "@type": "FoodEstablishment",
      "@id": `${SITE_URL}/#atabletonton`,
      name: "À table tonton !",
    },
    hasMenuSection: [
      {
        "@type": "MenuSection",
        name: "Pizzas",
        hasMenuItem: pizzas.map((pizza) => ({
          "@type": "MenuItem",
          name: pizza.name,
          description: pizza.description || pizza.ingredients || undefined,
          image:
            pizza.photos[0]?.imagePath || pizza.photoPath
              ? `${SITE_URL}${pizza.photos[0]?.imagePath ?? pizza.photoPath}`
              : undefined,
          offers: {
            "@type": "Offer",
            price: (pizza.priceCents / 100).toFixed(2),
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
          },
        })),
      },
    ],
  };
}

export default async function CartePage() {
  const [pizzas, events] = await Promise.all([
    getActivePizzas(),
    getVisiblePublishedEvents(),
  ]);
  const menuStructuredData = buildMenuStructuredData(pizzas);

  return (
    <PublicSiteShell currentPage="carte">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(menuStructuredData),
        }}
      />

      <section
        aria-labelledby="carte-title"
        style={{
          padding: "34px 0 32px",
        }}
      >
        <h1
          id="carte-title"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          Carte et commande de pizzas à Marval
        </h1>

        <img
          src="/assets/carte-hero-illustration.svg"
          alt=""
          aria-hidden="true"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
          }}
        />
      </section>

      {events.length > 0 ? (
        <section className="att-event-callout-list" aria-label="Événements à venir">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/evenements/${event.slug}`}
              className="att-event-callout"
              data-analytics-event="event_callout_click"
              data-analytics-label={event.title}
              data-analytics-target={`/evenements/${event.slug}`}
              data-event-slug={event.slug}
            >
              <div className="att-event-callout-copy">
                <strong>{event.title}</strong>
                <span>
                  {event.serviceDateLabel} · {event.opensAt} → {event.closesAt}
                </span>
                <em>
                  {event.isOrderingOpenNow
                    ? "Précommande ouverte"
                    : "Voir les informations de l’événement"}
                </em>
              </div>

              {event.images.length > 0 ? (
                <div className="att-event-callout-gallery" aria-hidden="true">
                  {event.images.map((image, index) => (
                    <img
                      key={`${image.id}-${image.imagePath}`}
                      src={image.imagePath}
                      alt=""
                      className={
                        event.images.length > 1
                          ? "att-event-callout-gallery-image"
                          : "att-event-callout-gallery-image att-event-callout-gallery-image-static"
                      }
                      style={getCalloutImageStyle(index, event.images.length)}
                    />
                  ))}
                </div>
              ) : (
                <div className="att-event-callout-doodle" aria-hidden="true">
                  <span />
                </div>
              )}
            </Link>
          ))}
        </section>
      ) : null}

      <PublicCarteBuilder pizzas={pizzas} />

      <section
        aria-label="Informations locales sur la carte"
        style={{
          maxWidth: "980px",
          margin: "20px auto 52px",
          padding: "0 20px",
          color: "rgba(17, 17, 17, 0.62)",
          fontSize: "0.84rem",
          fontWeight: 700,
          lineHeight: 1.5,
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0 }}>
          Retrouvez notre carte de pizzas à emporter à Marval, entre
          Haute-Vienne et Dordogne, et préparez votre demande de commande
          simplement.
        </p>
      </section>
    </PublicSiteShell>
  );
}