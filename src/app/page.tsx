import Link from "next/link";

import PublicSiteShell from "@/components/public-site-shell";
import { WEEKDAYS } from "@/lib/business-settings";
import { getPublicLocationsWithHours, getTodayServiceSettings } from "@/lib/data";
import type {
  BusinessLocation,
  LocationWithHours,
  OpeningHour,
  TodayServiceSettings,
} from "@/lib/types";

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
            Des pizzas gourmandes et généreuses,
            <br />
            préparées à Marval avec amour du goût !
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

      <section
        className="att-home-feature-grid att-home-feature-grid-two"
        aria-label="Informations principales"
      >
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
            <h2>Pizzas originales</h2>
            <p>
              Des pizzas gourmandes et généreuses, des recettes originales et des
              nouveautés chaque mois à venir découvrir !
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
            À table tonton !, c’est une petite aventure locale portée par Tonton,
            installé à Marval depuis 2023.
          </p>

          <p>
            Je viens de Grenoble, avec un nom italien dans mon histoire familiale :
            Di Tucci, du côté de ma mère. Ce n’est ni un label, ni un argument
            marketing : c’est un hommage. Ma gourmandise naît ici, de son amour,
            et de l’idée qu’elle m’a transmise : régaler ceux qu’on aime, c’est
            une façon de le leur dire.
          </p>

          <p>
            Avant d’en arriver là, j’ai travaillé dans plusieurs milieux, parfois
            dans des conditions difficiles. J’en ai gardé une conviction simple :
            quand on travaille dur et que chaque euro est compté, on mérite le
            meilleur : une cuisine sincère, généreuse, faite avec respect.
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
            vingt ans, elle y est un visage bien plus familier que le mien. Après
            ses toutes premières années en Angleterre, elle a grandi en Bourgogne,
            dans une famille où la gourmandise et la générosité faisaient partie
            de l’héritage. Chez elle aussi, bien manger n’a jamais été seulement
            une affaire de recette : c’est une manière d’accueillir, de
            transmettre, de prendre soin.
          </p>

          <p>
            Après plusieurs expériences dans la restauration, elle s’est découverte
            paysanne. Fromagère reconnue, éleveuse, maman, elle apporte à cette
            aventure son regard sur les produits, les saisons, le travail concret,
            et les choses bien faites.
          </p>

          <p>
            Elle est aussi la maman de Binette, petite fille géniale qui m’appelle
            “Tonton”, et qui a donné à ce projet une part de son nom, de sa
            tendresse, et de son désordre joyeux.
          </p>

          <p>
            <strong>Une ferme autour de la remorque</strong>
          </p>

          <p>
            À table tonton ! est né au milieu d’une vie bien réelle, sur une ferme
            de 13 hectares que nous habitons à plusieurs.
          </p>

          <p>
            Cette ferme, c’est d’abord le projet du papa de Binette, avec qui je
            partage plus de 20 ans d&apos;amitié. C’est aussi grâce à lui que je
            suis arrivé sur ce territoire, et que cette histoire a commencé à
            prendre forme.
          </p>

          <p>
            On y rénove, on y cultive, on y élève, on y apprend à vivre ensemble.
            Il y a des céréales, quelques légumes, des animaux, des urgences, des
            saisons qui passent trop vite, des choses qui cassent, des choses qui
            poussent. Beaucoup d’énergie est mise à faire vivre ce lieu, beaucoup
            de temps aussi.
          </p>

          <p>
            La ferme n&apos;a pas vocation à fournir la remorque au quotidien : ce
            n’est ni notre promesse, ni notre échelle. Mais elle raconte quelque
            chose de notre manière de vivre et de travailler : une attention aux
            gestes, aux saisons, aux produits et au temps qu’il faut pour essayer
            de bien faire.
          </p>

          <p>
            À table tonton !, c’est aussi cela : une petite activité locale, portée
            par un lieu vivant, une histoire d’amitiés, et l’envie de construire
            quelque chose ici.
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
            débouchés concrets et mettre en valeur leur travail. Quand le local ne
            suffit pas, nous cherchons des partenaires cohérents : artisans,
            filières plus transparentes, productions biologiques quand cela a du
            sens, toujours avec l’idée de limiter les intermédiaires inutiles.
          </p>

          <p>
            Notre carte évolue avec les saisons, les arrivages et les rencontres.
            Nous voulons cuisiner de très bons produits, sans transformer la
            qualité en luxe inaccessible. Pour cela, nous faisons des choix
            simples : une carte courte, moins de gaspillage, des recettes lisibles,
            et des prix aussi justes que possible.
          </p>

          <p>
            Nous ne prétendons pas avoir déjà trouvé la solution parfaite pour
            chaque ingrédient. Certaines contraintes de transport, de conservation
            ou de disponibilité nous obligent encore à faire des compromis. Mais
            nous préférons les assumer clairement.
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