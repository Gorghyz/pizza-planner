import type { CSSProperties } from "react";

import Link from "next/link";

import PublicSiteShell from "@/components/public-site-shell";
import {
  buildServiceSettingsForDate,
  getIsoWeekdayFromDateString,
  WEEKDAYS,
} from "@/lib/business-settings";
import { getPublicLocationsWithHours } from "@/lib/data";
import {
  applyCalendarExceptionToServiceSettings,
  getCalendarExceptionsForRange,
} from "@/lib/business-calendar";
import { getParisDateString } from "@/lib/dates";
import { getVisiblePublishedEvents } from "@/lib/events";
import { getActiveHomeImage } from "@/lib/home-images";
import type {
  BusinessLocation,
  BusinessCalendarException,
  BusinessEvent,
  LocationWithHours,
  TodayServiceSettings,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61588844054910";
const SITE_URL = "https://atabletonton.fr";

const SCHEMA_DAY_BY_ISO_WEEKDAY: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

type PublicHomeNotice =
  | {
      kind: "event";
      title: string;
      serviceDateLabel: string;
      opensAt: string;
      closesAt: string;
      isOrderingOpenNow?: boolean;
      images: {
        id: number;
        imagePath: string;
        altText: string;
      }[];
      href: string;
      buttonLabel: string;
    }
  | {
      kind: "closure";
      title: string;
      body: string;
    };

function getHomeEventCalloutImageStyle(
  index: number,
  imageCount: number,
): CSSProperties {
  if (imageCount <= 1) {
    return {};
  }

  return {
    animationDelay: `${index * 4}s`,
    animationDuration: `${imageCount * 4}s`,
  };
}

function buildOpenStreetMapUrl(
  location: BusinessLocation | null,
): string | null {
  if (!location) {
    return null;
  }

  if (
    typeof location.latitude === "number" &&
    typeof location.longitude === "number"
  ) {
    return `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`;
  }

  const query = [location.address.trim(), location.city.trim()]
    .filter(Boolean)
    .join(", ");

  if (!query) {
    return null;
  }

  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}

function buildOpenStreetMapEmbedUrl(
  location: BusinessLocation | null,
): string | null {
  if (
    !location ||
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number"
  ) {
    return null;
  }

  const lat = location.latitude;
  const lon = location.longitude;
  const deltaLat = 0.006;
  const deltaLon = 0.01;

  const bbox = [
    lon - deltaLon,
    lat - deltaLat,
    lon + deltaLon,
    lat + deltaLat,
  ].join(",");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
}

function formatServicePlace(todayService: TodayServiceSettings): string {
  if (!todayService.location) {
    return "Lieu à venir";
  }

  return [todayService.location.name, todayService.location.city]
    .filter(Boolean)
    .join(" — ");
}

function getActiveLocations(
  locations: LocationWithHours[],
): LocationWithHours[] {
  return locations.filter((location) => location.isActive);
}

function getCurrentLocationWithHours(
  locations: LocationWithHours[],
  todayService: TodayServiceSettings,
): LocationWithHours | null {
  if (!todayService.location) {
    return locations.find((location) => location.isActive) ?? null;
  }

  return (
    locations.find((location) => location.id === todayService.location?.id) ??
    locations.find((location) => location.isActive) ??
    null
  );
}

function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysToDateString(dateString: string, days: number): string {
  const date = parseDateString(dateString);
  date.setUTCDate(date.getUTCDate() + days);

  return toDateString(date);
}

function buildCurrentWeekRange(today: string) {
  const isoWeekday = getIsoWeekdayFromDateString(today);
  const startDate = addDaysToDateString(today, -(isoWeekday - 1));
  const endDate = addDaysToDateString(startDate, 6);

  return { startDate, endDate };
}

function formatShortWeekDate(date: string, weekdayLabel: string): string {
  return `${weekdayLabel} ${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

type PublicWeekScheduleDay = {
  date: string;
  label: string;
  isToday: boolean;
  service: TodayServiceSettings;
  exception: BusinessCalendarException | null;
  event: BusinessEvent | null;
};

function buildCurrentWeekSchedule({
  today,
  locations,
  exceptions,
  visibleEvents,
}: {
  today: string;
  locations: LocationWithHours[];
  exceptions: BusinessCalendarException[];
  visibleEvents: BusinessEvent[];
}): PublicWeekScheduleDay[] {
  const { startDate } = buildCurrentWeekRange(today);
  const exceptionMap = new Map(
    exceptions.map((exception) => [exception.serviceDate, exception]),
  );
  const eventsByDate = new Map<string, BusinessEvent[]>();

  for (const event of visibleEvents) {
    const current = eventsByDate.get(event.serviceDate) ?? [];
    current.push(event);
    eventsByDate.set(event.serviceDate, current);
  }

  return WEEKDAYS.map((_, index) => {
    const date = addDaysToDateString(startDate, index);
    const exception = exceptionMap.get(date) ?? null;
    const baseService = buildServiceSettingsForDate(locations, date);
    const service = applyCalendarExceptionToServiceSettings(
      baseService,
      exception,
    );
    const events = eventsByDate.get(date) ?? [];
    const event =
      events.sort((a, b) => a.opensAt.localeCompare(b.opensAt))[0] ?? null;

    return {
      date,
      label: formatShortWeekDate(date, service.weekdayLabel),
      isToday: date === today,
      service,
      exception,
      event,
    };
  });
}

function formatWeekServiceStatus(day: PublicWeekScheduleDay): string {
  if (day.exception?.status === "closed") {
    return day.exception.title || "Fermé exceptionnellement";
  }

  return day.service.isOpen
    ? `${day.service.opensAt} – ${day.service.closesAt}`
    : "fermé";
}

function buildOpeningHoursSpecification(location: LocationWithHours | null) {
  if (!location) {
    return undefined;
  }

  const openingHours = location.hours
    .filter((hour) => hour.isOpen && hour.opensAt && hour.closesAt)
    .map((hour) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: SCHEMA_DAY_BY_ISO_WEEKDAY[hour.isoWeekday],
      opens: hour.opensAt,
      closes: hour.closesAt,
    }))
    .filter((hour) => Boolean(hour.dayOfWeek));

  return openingHours.length > 0 ? openingHours : undefined;
}

function buildAreaServed(activeLocations: LocationWithHours[]) {
  const baseAreas = [
    "Marval",
    "Cussac",
    "Saint-Mathieu",
    "Piégut-Pluviers",
    "Abjat-sur-Bandiat",
    "Champniers-et-Reilhac",
    "Nontron",
    "Haute-Vienne",
    "Dordogne",
  ];

  const databaseAreas = activeLocations.flatMap((location) => [
    location.city,
    location.name,
  ]);

  const names = Array.from(
    new Set(
      [...baseAreas, ...databaseAreas]
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  );

  return names.map((name) => ({
    "@type":
      name === "Haute-Vienne" || name === "Dordogne"
        ? "AdministrativeArea"
        : "Place",
    name,
  }));
}

function buildPublicHomeNotice({
  locations,
  baseTodayService,
  todayException,
  visibleEvents,
}: {
  locations: LocationWithHours[];
  baseTodayService: TodayServiceSettings;
  todayException: BusinessCalendarException | null;
  visibleEvents: Awaited<ReturnType<typeof getVisiblePublishedEvents>>;
}): PublicHomeNotice | null {
  const overlappingEvent = visibleEvents.find((event) => {
    const baseService = buildServiceSettingsForDate(
      locations,
      event.serviceDate,
    );

    return baseService.isOpen;
  });

  if (overlappingEvent) {
    return {
      kind: "event",
      title: overlappingEvent.title,
      serviceDateLabel: overlappingEvent.serviceDateLabel,
      opensAt: overlappingEvent.opensAt,
      closesAt: overlappingEvent.closesAt,
      isOrderingOpenNow: overlappingEvent.isOrderingOpenNow,
      images: overlappingEvent.images.map((image) => ({
        id: image.id,
        imagePath: image.imagePath,
        altText: image.altText,
      })),
      href: `/evenements/${overlappingEvent.slug}`,
      buttonLabel: "Voir l'événement",
    };
  }

  if (todayException?.status === "closed" && baseTodayService.isOpen) {
    const reason = todayException.note || todayException.title;

    return {
      kind: "closure",
      title: todayException.title || "Fermeture exceptionnelle",
      body: reason
        ? `Le service habituel est fermé aujourd'hui. ${reason}`
        : "Le service habituel est fermé aujourd'hui.",
    };
  }

  return null;
}

function buildCurrentServicePlace(location: BusinessLocation | null) {
  if (!location) {
    return undefined;
  }

  const hasAddress = Boolean(location.address.trim() || location.city.trim());
  const hasGeo =
    typeof location.latitude === "number" &&
    typeof location.longitude === "number";

  return {
    "@type": "Place",
    name: [location.name, location.city].filter(Boolean).join(" — "),
    address: hasAddress
      ? {
          "@type": "PostalAddress",
          streetAddress: location.address || undefined,
          addressLocality: location.city || undefined,
          addressCountry: "FR",
        }
      : undefined,
    geo: hasGeo
      ? {
          "@type": "GeoCoordinates",
          latitude: location.latitude,
          longitude: location.longitude,
        }
      : undefined,
  };
}

function buildHomeStructuredData(
  todayService: TodayServiceSettings,
  currentLocation: LocationWithHours | null,
  activeLocations: LocationWithHours[],
  mapUrl: string | null,
  homeImagePath: string | null,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    "@id": `${SITE_URL}/#atabletonton`,
    name: "À table tonton !",
    description:
      "Foodtruck de pizzas gourmandes et originales à Marval, entre Haute-Vienne et Dordogne.",
    url: SITE_URL,
    image: homeImagePath
      ? `${SITE_URL}${homeImagePath}`
      : `${SITE_URL}/assets/og-image.png`,
    logo: `${SITE_URL}/assets/logo-header.svg`,
    telephone: "+33679958962",
    email: "contact@atabletonton.fr",
    address: {
      "@type": "PostalAddress",
      streetAddress: "35 La Varlanchie",
      postalCode: "87440",
      addressLocality: "Marval",
      addressCountry: "FR",
    },
    servesCuisine: ["Pizza", "Cuisine artisanale", "Street food"],
    priceRange: "€€",
    sameAs: [FACEBOOK_URL],
    hasMenu: `${SITE_URL}/carte`,
    areaServed: buildAreaServed(activeLocations),
    openingHoursSpecification: buildOpeningHoursSpecification(currentLocation),
    hasMap: mapUrl || undefined,
    location: buildCurrentServicePlace(todayService.location),
  };
}

export default async function PublicHomePage() {
  const today = getParisDateString();
  const currentWeekRange = buildCurrentWeekRange(today);
  const [locations, activeHomeImage, weekExceptions, visibleEvents] =
    await Promise.all([
      getPublicLocationsWithHours(),
      getActiveHomeImage(),
      getCalendarExceptionsForRange(
        currentWeekRange.startDate,
        currentWeekRange.endDate,
      ),
      getVisiblePublishedEvents(),
    ]);

  const todayException =
    weekExceptions.find((exception) => exception.serviceDate === today) ?? null;
  const baseTodayService = buildServiceSettingsForDate(locations, today);
  const todayService = applyCalendarExceptionToServiceSettings(
    baseTodayService,
    todayException,
  );
  const activeLocations = getActiveLocations(locations);
  const currentLocation = getCurrentLocationWithHours(locations, todayService);
  const currentWeekSchedule = buildCurrentWeekSchedule({
    today,
    locations,
    exceptions: weekExceptions,
    visibleEvents,
  });
  const homeNotice = buildPublicHomeNotice({
    locations,
    baseTodayService,
    todayException,
    visibleEvents,
  });
  const mapUrl = buildOpenStreetMapUrl(todayService.location);
  const mapEmbedUrl = buildOpenStreetMapEmbedUrl(todayService.location);
  const homeStructuredData = buildHomeStructuredData(
    todayService,
    currentLocation,
    activeLocations,
    mapUrl,
    activeHomeImage?.imagePath ?? null,
  );

  const heroImageSrc = activeHomeImage?.imagePath || "/assets/hero-desktop.svg";
  const heroImageAlt =
    activeHomeImage?.altText ||
    activeHomeImage?.title ||
    "Pizzas du moment À table tonton !";
  const hasActiveHomeImage = Boolean(activeHomeImage);
  const shouldShowDefaultHomeIllustration = !homeNotice && hasActiveHomeImage;

  return (
    <PublicSiteShell currentPage="home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeStructuredData),
        }}
      />

      <section
        className="att-home-hero"
        style={{
          display: "block",
          maxWidth: "1320px",
          minHeight: "auto",
          margin: "28px auto 0",
          padding: "0 24px",
        }}
      >
        <div
          className="att-home-hero-copy"
          style={{
            maxWidth: "100%",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              maxWidth: "1180px",
              margin: "0 auto",
              fontSize: "clamp(1.7rem, 2.8vw, 2.6rem)",
              lineHeight: 1.08,
            }}
          >
            Des pizzas gourmandes et généreuses,
            <br />
            préparées à Marval avec amour du goût !
          </h1>
        </div>

        <div
          className="att-home-hero-image-wrap"
          style={{
            width: "100%",
            maxWidth: "100%",
            flex: "none",
            margin: "0 auto",
          }}
        >
          {hasActiveHomeImage ? (
            <Link
              href="/carte"
              aria-label="Voir la carte et commander"
              data-analytics-event="home_hero_click"
              data-analytics-label="Image accueil"
              data-analytics-target="/carte"
              style={{
                display: "block",
                width: "100%",
                overflow: "hidden",
                border: "2px solid #1c1c1c",
                borderRadius: "18px",
                background: "#fff",
                boxShadow: "0 10px 28px rgba(0, 0, 0, 0.10)",
              }}
            >
              <img
                src={heroImageSrc}
                alt={heroImageAlt}
                className="att-home-hero-image"
                style={{
                  width: "100%",
                  aspectRatio: "3 / 1",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </Link>
          ) : (
            <img
              src={heroImageSrc}
              alt=""
              className="att-home-hero-image"
              aria-hidden="true"
            />
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "16px",
          }}
        >
          <Link
            href="/carte"
            className="att-black-button"
            data-analytics-event="home_cta_click"
            data-analytics-label="Voir la carte / Commander"
            data-analytics-target="/carte"
          >
            Voir la carte / Commander
          </Link>
        </div>
      </section>

      {homeNotice ? (
        homeNotice.kind === "event" ? (
          <section
            className="att-event-callout-list"
            aria-label="Événement à venir"
            style={{ marginTop: "32px" }}
          >
            <Link
              href={homeNotice.href}
              className="att-event-callout"
              data-analytics-event="event_callout_click"
              data-analytics-label={homeNotice.title}
              data-analytics-target={homeNotice.href}
            >
              <div className="att-event-callout-copy">
                <strong>{homeNotice.title}</strong>
                <span>
                  {homeNotice.serviceDateLabel} · {homeNotice.opensAt} → {homeNotice.closesAt}
                </span>
                <em>
                  {homeNotice.isOrderingOpenNow
                    ? "Précommande ouverte"
                    : homeNotice.buttonLabel}
                </em>
              </div>

              {homeNotice.images.length > 0 ? (
                <div className="att-event-callout-gallery" aria-hidden="true">
                  {homeNotice.images.map((image, index) => (
                    <img
                      key={`${image.id}-${image.imagePath}`}
                      src={image.imagePath}
                      alt=""
                      className={
                        homeNotice.images.length > 1
                          ? "att-event-callout-gallery-image"
                          : "att-event-callout-gallery-image att-event-callout-gallery-image-static"
                      }
                      style={getHomeEventCalloutImageStyle(
                        index,
                        homeNotice.images.length,
                      )}
                    />
                  ))}
                </div>
              ) : (
                <div className="att-event-callout-doodle" aria-hidden="true">
                  <span />
                </div>
              )}
            </Link>
          </section>
        ) : (
          <section
            aria-label="Information importante"
            style={{
              maxWidth: "760px",
              margin: "18px auto 22px",
              padding: "0 24px",
            }}
          >
            <div
              className="att-ink-card"
              style={{
                textAlign: "center",
                padding: "22px",
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                }}
              >
                Information service
              </p>
              <h2 style={{ margin: "0 0 10px" }}>{homeNotice.title}</h2>
              <p style={{ margin: "0 auto 16px", maxWidth: "560px" }}>
                {homeNotice.body}
              </p>
              <Link
                href="/carte"
                className="att-black-button"
                data-analytics-event="closure_notice_click"
                data-analytics-label="Voir la carte"
                data-analytics-target="/carte"
              >
                Voir la carte
              </Link>
            </div>
          </section>
        )
      ) : shouldShowDefaultHomeIllustration ? (
        <section
          aria-label="Illustration À table tonton !"
          style={{
            maxWidth: "760px",
            margin: "18px auto 22px",
            padding: "0 24px",
          }}
        >
          <Link
            href="/carte"
            aria-label="Voir la carte et commander"
            data-analytics-event="home_illustration_click"
            data-analytics-label="Illustration accueil"
            data-analytics-target="/carte"
            style={{
              display: "block",
              overflow: "hidden",
              border: "2px solid #1c1c1c",
              borderRadius: "18px",
              background: "#fff",
              boxShadow: "0 6px 18px rgba(0, 0, 0, 0.06)",
              padding: "8px 14px",
            }}
          >
            <img
              src="/assets/hero-desktop.svg"
              alt=""
              aria-hidden="true"
              style={{
                width: "100%",
                maxHeight: "150px",
                objectFit: "contain",
                display: "block",
              }}
            />
          </Link>
        </section>
      ) : (
        <section
          className="att-home-feature-grid att-home-feature-grid-two"
          aria-label="Informations principales"
        >
          <Link
            href="/carte"
            className="att-ink-card att-feature-card att-feature-card-link"
            data-analytics-event="home_feature_click"
            data-analytics-label="Commander facilement"
            data-analytics-target="/carte"
          >
            <div className="att-feature-icon att-feature-icon-image">
              <img src="/assets/icon-order.svg" alt="" aria-hidden="true" />
            </div>
            <div>
              <h2>Commander facilement</h2>
              <p>
                Préparez votre demande facilement via notre page dédiée, par SMS
                ou sur navigateur.
              </p>
            </div>
          </Link>

          <Link
            href="/carte"
            className="att-ink-card att-feature-card att-feature-card-link"
            data-analytics-event="home_feature_click"
            data-analytics-label="Pizzas originales"
            data-analytics-target="/carte"
          >
            <div className="att-feature-icon att-feature-icon-image">
              <img
                src="/assets/icon-original-pizza.svg"
                alt=""
                aria-hidden="true"
              />
            </div>
            <div>
              <h2>Pizzas originales</h2>
              <p>
                Des pizzas gourmandes et généreuses, des recettes originales et
                des nouveautés chaque mois à venir découvrir !
              </p>
            </div>
          </Link>
        </section>
      )}

      <section
        id="ou-nous-trouver"
        className="att-home-section"
        style={{
          marginTop: "18px",
        }}
      >
        <h2 className="att-section-title">Où nous trouver</h2>

        <div className="att-location-layout">
          <div className="att-location-cards">
            <article className="att-ink-card att-small-info-card">
              <div className="att-info-icon att-info-icon-image">
                <img
                  src="/assets/icon-location-pin.svg"
                  alt=""
                  aria-hidden="true"
                />
              </div>
              <div>
                <h3>Services du soir</h3>
                <p>{formatServicePlace(todayService)}</p>
              </div>
            </article>

            <article className="att-ink-card att-small-info-card att-hours-card">
              <div className="att-info-icon">▷</div>
              <div>
                <h3>Horaires cette semaine</h3>

                <ul className="att-week-hours">
                  {currentWeekSchedule.map((day) => (
                    <li
                      key={day.date}
                      className={day.isToday ? "att-today" : ""}
                    >
                      <span>{day.label}</span>

                      {day.event ? (
                        <Link
                          href={`/evenements/${day.event.slug}`}
                          className="att-week-event-link"
                          data-analytics-event="week_event_click"
                          data-analytics-label={day.event.title}
                          data-analytics-target={`/evenements/${day.event.slug}`}
                          data-event-slug={day.event.slug}
                        >
                          {day.event.title}
                        </Link>
                      ) : (
                        <span>{formatWeekServiceStatus(day)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="att-ink-card att-small-info-card">
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noreferrer"
                className="att-info-icon att-info-facebook att-info-facebook-image"
                aria-label="Suivez-nous sur Facebook"
                data-analytics-event="external_click"
                data-analytics-label="Facebook accueil"
                data-analytics-target="facebook"
              >
                <img
                  src="/assets/icon-facebook.svg"
                  alt=""
                  aria-hidden="true"
                />
              </a>

              <div>
                <h3>Actualités</h3>
                <p>
                  Envie d&apos;être informé.e en temps réel ? Rejoignez notre
                  page Facebook pour suivre les actualités.
                </p>
              </div>
            </article>
          </div>

          <article className="att-map-card">
            {mapEmbedUrl ? (
              <iframe
                src={mapEmbedUrl}
                title="Carte OpenStreetMap du lieu de service"
                className="att-osm-iframe"
                loading="lazy"
              />
            ) : (
              <div className="att-map-card-inner">
                <span className="att-map-pin" aria-hidden="true">
                  ●
                </span>

                <div>
                  <h3>{todayService.location?.city || "À table tonton !"}</h3>
                  <p>
                    Les coordonnées GPS du lieu de service seront bientôt
                    publiées.
                  </p>
                </div>
              </div>
            )}

            <div className="att-map-overlay">
              <h3>{todayService.location?.city || "À table tonton !"}</h3>

              {todayService.location ? (
                <p>
                  {todayService.location.name}
                  {todayService.location.address ? (
                    <>
                      <br />
                      {todayService.location.address}
                    </>
                  ) : null}
                  {todayService.location.city ? (
                    <>
                      <br />
                      {todayService.location.city}
                    </>
                  ) : null}
                </p>
              ) : (
                <p>Les informations de lieu seront bientôt publiées ici.</p>
              )}

              {mapUrl ? (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  data-analytics-event="map_click"
                  data-analytics-label="OpenStreetMap accueil"
                  data-analytics-target="openstreetmap"
                >
                  Voir sur OpenStreetMap
                </a>
              ) : null}
            </div>
          </article>
        </div>

        {activeLocations.length > 1 ? (
          <div className="att-location-list">
            {activeLocations.map((location) => (
              <span key={location.id}>{location.name}</span>
            ))}
          </div>
        ) : null}
      </section>

      <section
        id="qui-sommes-nous"
        className="att-home-section att-about-section"
      >
        <div
          className="att-about-image-wrap"
          style={{
            alignSelf: "flex-start",
          }}
        >
          <img
            src="/assets/about-logo-large.svg"
            alt="À table tonton !"
            className="att-about-image"
          />
        </div>

        <div className="att-about-copy">
          <h2 className="att-section-title">Qui sommes-nous ?</h2>

          <p>
            À table tonton !, c’est une petite aventure locale portée par
            Tonton, installé à Marval depuis 2023.
          </p>

          <p>
            Je viens de Grenoble, avec un nom italien dans mon histoire
            familiale : Di Tucci, du côté de ma mère. Ce n’est ni un label, ni
            un argument marketing : c’est un hommage. Ma gourmandise naît ici,
            de son amour, et de l’idée qu’elle m’a transmise : régaler ceux
            qu’on aime, c’est une façon de le leur dire.
          </p>

          <p>
            Avant d’en arriver là, j’ai travaillé dans plusieurs milieux,
            parfois dans des conditions difficiles. J’en ai gardé une conviction
            simple : quand on travaille dur et que chaque euro est compté, on
            mérite le meilleur : une cuisine sincère, généreuse, faite avec
            respect.
          </p>

          <p>
            C’est ce que j’essaie de faire avec À table tonton ! : des pizzas de
            qualité, une carte courte, des produits choisis avec soin, moins de
            gaspillage, et des prix aussi justes que possible.
          </p>

          <p>
            Je suis gourmand, curieux, un peu touche-à-tout. J’aime apprendre,
            essayer, améliorer. Cette remorque, c’est ma façon de cuisiner
            simplement, de faire plaisir, et de proposer quelque chose de bon à
            partager.
          </p>

          <p>Dans l’aventure À table tonton !, il y a aussi ma complice.</p>

          <p>
            D’origine britannique, installée sur le territoire depuis près de
            vingt ans, elle y est un visage bien plus familier que le mien.
            Après ses toutes premières années en Angleterre, elle a grandi en
            Bourgogne, dans une famille où la gourmandise et la générosité
            faisaient partie de l’héritage. Chez elle aussi, bien manger n’a
            jamais été seulement une affaire de recette : c’est une manière
            d’accueillir, de transmettre, de prendre soin.
          </p>

          <p>
            Après plusieurs expériences dans la restauration, elle s’est
            découverte paysanne. Fromagère reconnue, éleveuse, maman, elle
            apporte à cette aventure son regard sur les produits, les saisons,
            le travail concret, et les choses bien faites.
          </p>

          <p>
            Elle est aussi la maman de Binette, petite fille géniale qui
            m’appelle “Tonton”, et qui a donné à ce projet une part de son nom,
            de sa tendresse, et de son désordre joyeux.
          </p>

          <p>
            <strong>Une ferme autour de la remorque</strong>
          </p>

          <p>
            À table tonton ! est né au milieu d’une vie bien réelle, sur une
            ferme de 13 hectares que nous habitons à plusieurs.
          </p>

          <p>
            Cette ferme, c’est d’abord le projet du papa de Binette, avec qui je
            partage plus de 20 ans d&apos;amitié. C’est aussi grâce à lui que je
            suis arrivé sur ce territoire, et que cette histoire a commencé à
            prendre forme.
          </p>

          <p>
            On y rénove, on y cultive, on y élève, on y apprend à vivre
            ensemble. Il y a des céréales, quelques légumes, des animaux, des
            urgences, des saisons qui passent trop vite, des choses qui cassent,
            des choses qui poussent. Beaucoup d’énergie est mise à faire vivre
            ce lieu, beaucoup de temps aussi.
          </p>

          <p>
            La ferme n&apos;a pas vocation à fournir la remorque au quotidien :
            ce n’est ni notre promesse, ni notre échelle. Mais elle raconte
            quelque chose de notre manière de vivre et de travailler : une
            attention aux gestes, aux saisons, aux produits et au temps qu’il
            faut pour essayer de bien faire.
          </p>

          <p>
            À table tonton !, c’est aussi cela : une petite activité locale,
            portée par un lieu vivant, une histoire d’amitiés, et l’envie de
            construire quelque chose ici.
          </p>
        </div>
      </section>

      <section id="nos-valeurs" className="att-home-section att-values-section">
        <h2 className="att-section-title">Nos valeurs</h2>

        <article className="att-ink-card att-values-text-card">
          <p>
            Chez À table tonton !, nous voulons proposer une cuisine simple,
            généreuse et exigeante, qui respecte autant les producteurs que les
            clients.
          </p>

          <p>
            Nous privilégions les circuits courts dès que c’est possible, pour
            travailler avec des producteurs du territoire, leur offrir des
            débouchés concrets et mettre en valeur leur travail. Quand le local
            ne suffit pas, nous cherchons des partenaires cohérents : artisans,
            filières plus transparentes, productions biologiques quand cela a du
            sens, toujours avec l’idée de limiter les intermédiaires inutiles.
          </p>

          <p>
            Notre carte évolue avec les saisons, les arrivages et les
            rencontres. Nous voulons cuisiner de très bons produits, sans
            transformer la qualité en luxe inaccessible. Pour cela, nous faisons
            des choix simples : une carte courte, moins de gaspillage, des
            recettes lisibles, et des prix aussi justes que possible.
          </p>

          <p>
            Nous ne prétendons pas avoir déjà trouvé la solution parfaite pour
            chaque ingrédient. Certaines contraintes de transport, de
            conservation ou de disponibilité nous obligent encore à faire des
            compromis. Mais nous préférons les assumer clairement.
          </p>

          <p>
            Notre première valeur, c’est la transparence. La seconde, c’est de
            faire de notre mieux.
          </p>
        </article>
      </section>

      <section
        aria-label="Informations locales"
        style={{
          maxWidth: "980px",
          margin: "12px auto 48px",
          padding: "0 20px",
          color: "rgba(17, 17, 17, 0.64)",
          fontSize: "0.84rem",
          fontWeight: 700,
          lineHeight: 1.5,
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0 }}>
          À table tonton ! est un foodtruck de pizzas à emporter à Marval, entre
          Haute-Vienne et Dordogne, à proximité de Cussac, Saint-Mathieu,
          Piégut-Pluviers, Abjat-sur-Bandiat, Champniers-et-Reilhac et Nontron.
          Nous proposons des pizzas gourmandes, généreuses et originales,
          préparées selon les services annoncés.
        </p>
      </section>
    </PublicSiteShell>
  );
}
