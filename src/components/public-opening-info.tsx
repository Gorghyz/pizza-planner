import { WEEKDAYS } from "@/lib/business-settings";
import type { LocationWithHours, TodayServiceSettings } from "@/lib/types";

type PublicOpeningInfoProps = {
  locations: LocationWithHours[];
  todayService: TodayServiceSettings;
};

export default function PublicOpeningInfo({
  locations,
  todayService,
}: PublicOpeningInfoProps) {
  const activeLocations = locations.filter((location) => location.isActive);

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
      </div>

      {activeLocations.length === 0 ? (
        <p className="empty" style={{ marginTop: 16 }}>
          Les informations de lieu et d&apos;horaires seront bientôt publiées ici.
        </p>
      ) : (
        <div className="public-card-grid" style={{ marginTop: 16 }}>
          {activeLocations.map((location) => (
            <article key={location.id} className="card feature-card">
              <h3 style={{ marginTop: 0 }}>{location.name}</h3>
              <div className="multiline-text">
                {location.address || "Adresse non renseignée"}
                {location.city ? `\n${location.city}` : ""}
                {location.notes ? `\n\n${location.notes}` : ""}
              </div>

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
          ))}
        </div>
      )}
    </section>
  );
}