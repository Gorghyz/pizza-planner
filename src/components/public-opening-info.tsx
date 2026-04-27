import { WEEKDAYS } from "@/lib/business-settings";
import type { LocationWithHours, TodayServiceSettings } from "@/lib/types";

type PublicOpeningInfoProps = {
  locations: LocationWithHours[];
  todayService: TodayServiceSettings;
};

function buildOpenStreetMapUrl(
  address: string,
  city: string,
  latitude: number | null,
  longitude: number | null,
): string | null {
  if (typeof latitude === "number" && typeof longitude === "number") {
    return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;
  }

  const query = [address.trim(), city.trim()].filter(Boolean).join(", ");

  if (!query) {
    return null;
  }

  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}

export default function PublicOpeningInfo({
  locations,
  todayService,
}: PublicOpeningInfoProps) {
  const activeLocations = locations.filter((location) => location.isActive);

  const todayMapsUrl = todayService.location
    ? buildOpenStreetMapUrl(
        todayService.location.address,
        todayService.location.city,
        todayService.location.latitude,
        todayService.location.longitude,
      )
    : null;

  return (
    <section className="card" style={{ marginTop: 24 }}>
      <h2>Où nous trouver / Horaires</h2>

      <div className="catalog-section">
        <strong>Service du jour</strong>
        <div className="multiline-text">
          {todayService.location ? `${todayService.location.name}\n` : ""}
          {todayService.location?.address ? `${todayService.location.address}\n` : ""}
          {todayService.location?.city ? `${todayService.location.city}\n` : ""}
          {todayService.weekdayLabel} :{" "}
          {todayService.isOpen
            ? `${todayService.opensAt} → ${todayService.closesAt}`
            : "fermé"}
        </div>

        {todayMapsUrl ? (
          <div style={{ marginTop: 12 }}>
            <a
              href={todayMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="link-button secondary-link"
            >
              Voir sur OpenStreetMap
            </a>
          </div>
        ) : null}
      </div>

      {activeLocations.length === 0 ? (
        <p className="empty" style={{ marginTop: 16 }}>
          Les informations de lieu et d&apos;horaires seront bientôt publiées ici.
        </p>
      ) : (
        <div className="public-card-grid" style={{ marginTop: 16 }}>
          {activeLocations.map((location) => {
            const mapsUrl = buildOpenStreetMapUrl(
              location.address,
              location.city,
              location.latitude,
              location.longitude,
            );

            return (
              <article key={location.id} className="card feature-card">
                <h3 style={{ marginTop: 0 }}>{location.name}</h3>

                <div className="multiline-text">
                  {location.address || "Adresse non renseignée"}
                  {location.city ? `\n${location.city}` : ""}
                  {location.notes ? `\n\n${location.notes}` : ""}
                </div>

                {mapsUrl ? (
                  <div style={{ marginTop: 12 }}>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="link-button secondary-link"
                    >
                      Voir sur OpenStreetMap
                    </a>
                  </div>
                ) : null}

                <div className="catalog-section">
                  <strong>Horaires</strong>
                  <div className="multiline-text">
                    {WEEKDAYS.map((day) => {
                      const hour = location.hours.find(
                        (entry) => entry.isoWeekday === day.value,
                      );

                      if (!hour || !hour.isOpen || !hour.opensAt || !hour.closesAt) {
                        return `${day.label} : fermé`;
                      }

                      return `${day.label} : ${hour.opensAt} → ${hour.closesAt}`;
                    }).join("\n")}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}