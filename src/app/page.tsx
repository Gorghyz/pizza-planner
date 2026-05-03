import Link from "next/link";

import PublicSiteShell from "@/components/public-site-shell";
import { WEEKDAYS } from "@/lib/business-settings";
import { getPublicLocationsWithHours, getTodayServiceSettings } from "@/lib/data";
import type { BusinessLocation, LocationWithHours, OpeningHour, TodayServiceSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61588844054910";

function buildOpenStreetMapUrl(location: BusinessLocation | null): string | null {
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

function buildOpenStreetMapEmbedUrl(location: BusinessLocation | null): string | null {
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

function getActiveLocations(locations: LocationWithHours[]): LocationWithHours[] {
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

function formatOpeningHour(hour: OpeningHour | undefined): string {
  if (!hour || !hour.isOpen || !hour.opensAt || !hour.closesAt) {
    return "fermé";
  }

  return `${hour.opensAt} – ${hour.closesAt}`;
}

function buildOrderedWeekdays(todayIsoWeekday: number) {
  const todayIndex = WEEKDAYS.findIndex((day) => day.value === todayIsoWeekday);

  if (todayIndex < 0) {
    return WEEKDAYS;
  }

  return [...WEEKDAYS.slice(todayIndex), ...WEEKDAYS.slice(0, todayIndex)];
}

export default async function PublicHomePage() {
  const [locations, todayService] = await Promise.all([
    getPublicLocationsWithHours(),
    getTodayServiceSettings(),
  ]);

  const activeLocations = getActiveLocations(locations);
  const currentLocation = getCurrentLocationWithHours(locations, todayService);
  const mapUrl = buildOpenStreetMapUrl(todayService.location);
  const mapEmbedUrl = buildOpenStreetMapEmbedUrl(todayService.location);
  const orderedWeekdays = buildOrderedWeekdays(todayService.isoWeekday);

  return (
    <PublicSiteShell currentPage="home">
      <section className="att-home-hero">
        <div className="att-home-hero-copy">
          <h1>
            Des pizzas artisanales,
            <br />
            de saison et locales
            <br />
            à commander
            <br />
            simplement !
          </h1>

          <Link href="/carte" className="att-black-button">
            Voir la carte / Commander
          </Link>
        </div>

        <div className="att-home-hero-image-wrap">
          <img
            src="/assets/hero-desktop.svg"
            alt=""
            className="att-home-hero-image"
            aria-hidden="true"
          />
        </div>
      </section>

      <section className="att-home-feature-grid att-home-feature-grid-two" aria-label="Informations principales">
        <article className="att-ink-card att-feature-card">
          <div className="att-feature-icon">◉</div>
          <div>
            <h2>Commander facilement</h2>
            <p>
              Préparez votre demande facilement via notre page dédiée, par SMS ou
              sur navigateur.
            </p>
          </div>
        </article>

        <article className="att-ink-card att-feature-card">
          <div className="att-feature-icon">⌁</div>
          <div>
            <h2>Pizzas généreuses</h2>
            <p>
              Des pizzas gourmandes et généreuses et des nouveautés chaque mois à
              venir découvrir !
            </p>
          </div>
        </article>
      </section>

      <section id="ou-nous-trouver" className="att-home-section">
        <h2 className="att-section-title">Où nous trouver</h2>

        <div className="att-location-layout">
          <div className="att-location-cards">
            <article className="att-ink-card att-small-info-card">
              <div className="att-info-icon">●</div>
              <div>
                <h3>Services du soir</h3>
                <p>{formatServicePlace(todayService)}</p>
              </div>
            </article>

            <article className="att-ink-card att-small-info-card att-hours-card">
              <div className="att-info-icon">◷</div>
              <div>
                <h3>Horaires</h3>

                <ul className="att-week-hours">
                  {orderedWeekdays.map((day) => {
                    const hour = currentLocation?.hours.find(
                      (entry) => entry.isoWeekday === day.value,
                    );

                    const isToday = day.value === todayService.isoWeekday;

                    return (
                      <li key={day.value} className={isToday ? "att-today" : ""}>
                        <span>{day.label}</span>
                        <span>{formatOpeningHour(hour)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </article>

            <article className="att-ink-card att-small-info-card">
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noreferrer"
                className="att-info-icon att-info-facebook"
                aria-label="Suivez-nous sur Facebook"
              >
                f
              </a>

              <div>
                <h3>Actualités</h3>
                <p>
                  Envie d&apos;être informé.e en temps réel ? Rejoignez notre page
                  Facebook pour suivre les actualités.
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
                  <p>Les coordonnées GPS du lieu de service seront bientôt publiées.</p>
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
                <a href={mapUrl} target="_blank" rel="noreferrer">
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

      <section id="qui-sommes-nous" className="att-home-section att-about-section">
        <div className="att-about-image-wrap">
          <img
            src="/assets/about-logo-large.svg"
            alt="À table tonton !"
            className="att-about-image"
          />
        </div>

        <div className="att-about-copy">
          <h2 className="att-section-title">Qui sommes-nous ?</h2>

          <p>
            À bord de notre remorque, nous préparons des pizzas artisanales avec
            des produits locaux et de saison.
          </p>

          <p>
            Notre carte est courte et évolue régulièrement au gré des envies et
            des récoltes, en faisant rimer qualité et simplicité.
          </p>

          <p>
            Ici, tout est fait avec passion, convivialité et générosité. Merci de
            faire vivre votre aventure locale !
          </p>

          <div className="att-heart" aria-hidden="true">
            ♡
          </div>
        </div>
      </section>

      <section id="nos-valeurs" className="att-home-section att-values-section">
        <h2 className="att-section-title">Nos valeurs</h2>

        <article className="att-ink-card att-values-text-card">
          <p>
            Nous aimerions pouvoir vous dire que tous nos produits sont frais,
            locaux et de saison. Qu&apos;ils sont bios, et qu&apos;ils permettent
            aux producteurs de vivre confortablement de leur travail. Mais nous
            voulons aussi proposer une offre qui soit accessible à tous, parce que
            c&apos;est aussi ça être généreux. Alors, vu les temps difficiles que
            nous traversons, nous faisons le choix d&apos;être honnête : nous
            faisons du mieux possible, et nous nous adaptons.
          </p>

          <p>
            Pour vivre correctement de ce travail, nous fixons nos prix de façon à
            ce que notre marge nette soit de 7 à 8 € par produit vendu. Le calcul
            du prix prend donc en compte tout un faisceau de paramètres, parmi
            lesquels : ingrédients, prix de l&apos;énergie, assurances, emballage,
            etc.
          </p>

          <p>
            Nous apprécions d&apos;avoir vos retours, alors n&apos;hésitez pas à
            laisser ça et là vos avis concernant notre travail !
          </p>

          <p className="att-values-signature">Tonton.</p>
        </article>
      </section>
    </PublicSiteShell>
  );
}