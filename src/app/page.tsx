import Link from "next/link";

import PublicSiteShell from "@/components/public-site-shell";
import { getPublicLocationsWithHours, getTodayServiceSettings } from "@/lib/data";
import type { BusinessLocation, LocationWithHours, TodayServiceSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

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

function formatServicePlace(todayService: TodayServiceSettings): string {
  if (!todayService.location) {
    return "Lieu à venir";
  }

  return [todayService.location.name, todayService.location.city]
    .filter(Boolean)
    .join(" — ");
}

function formatServiceHours(todayService: TodayServiceSettings): string {
  if (!todayService.isOpen) {
    return `${todayService.weekdayLabel} : fermé`;
  }

  return `${todayService.weekdayLabel} : ${todayService.opensAt} – ${todayService.closesAt}`;
}

function getActiveLocations(locations: LocationWithHours[]): LocationWithHours[] {
  return locations.filter((location) => location.isActive);
}

export default async function PublicHomePage() {
  const [locations, todayService] = await Promise.all([
    getPublicLocationsWithHours(),
    getTodayServiceSettings(),
  ]);

  const activeLocations = getActiveLocations(locations);
  const mapUrl = buildOpenStreetMapUrl(todayService.location);

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

      <section className="att-home-feature-grid" aria-label="Informations principales">
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
          <div className="att-feature-icon">▣</div>
          <div>
            <h2>Horaires & lieux</h2>
            <p>Retrouvez où nous trouver et nos horaires mis à jour.</p>
          </div>
        </article>

        <article className="att-ink-card att-feature-card">
          <div className="att-feature-icon">⌁</div>
          <div>
            <h2>Pizzas de saison</h2>
            <p>
              Des recettes inspirées par la saison, avec des ingrédients locaux
              sélectionnés avec soin.
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

            <article className="att-ink-card att-small-info-card">
              <div className="att-info-icon">◷</div>
              <div>
                <h3>Horaires</h3>
                <p>{formatServiceHours(todayService)}</p>
              </div>
            </article>

            <article className="att-ink-card att-small-info-card">
              <div className="att-info-icon">✉</div>
              <div>
                <h3>Toute l’actu par SMS !</h3>
                <p>
                  Envie d’être informé·e en temps réel ? Inscrivez-vous via notre
                  page dédiée.
                </p>
              </div>
            </article>
          </div>

          <article className="att-map-card">
            <div className="att-map-card-inner">
              <span className="att-map-pin" aria-hidden="true">
                ●
              </span>

              <div>
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

        <div className="att-values-grid">
          <article className="att-ink-card att-value-card">
            <div className="att-value-symbol">⌁</div>
            <h3>Une carte courte, qui change avec les saisons</h3>
            <p>
              Des recettes au fil des récoltes pour une pizza toujours
              savoureuse.
            </p>
          </article>

          <article className="att-ink-card att-value-card">
            <div className="att-value-symbol">◉</div>
            <h3>Des ingrédients et des gourmandises de découverte</h3>
            <p>
              Nous sélectionnons avec soin nos produits auprès de producteurs
              locaux.
            </p>
          </article>

          <article className="att-ink-card att-value-card">
            <div className="att-value-symbol">◠</div>
            <h3>Une pâte généreuse et gourmande</h3>
            <p>
              Pétrie lentement pour plus de légèreté et des plaisirs
              authentiques.
            </p>
          </article>

          <article className="att-ink-card att-value-card">
            <div className="att-value-symbol">✓</div>
            <h3>Un service simple : tu commandes, on confirme, et c’est prêt !</h3>
            <p>Prise de demande et retrait sur place sans tracas.</p>
          </article>
        </div>
      </section>
    </PublicSiteShell>
  );
}