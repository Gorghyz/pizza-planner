import BusinessSectionNav from "@/components/business-navigation";
import BusinessSettingsAdmin from "@/components/business-settings-admin";
import { getBusinessLocationsWithHours, getTodayServiceSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BusinessAdminPage() {
  const [locations, todayService] = await Promise.all([
    getBusinessLocationsWithHours(),
    getTodayServiceSettings(),
  ]);

  return (
    <main className="page">
      <header className="page-header">
        <h1>Administration business</h1>
        <p>
          Gère ici les lieux, les jours d&apos;ouverture et les horaires utilisés
          pour l&apos;affichage client et les créneaux proposés.
        </p>

        <BusinessSectionNav section="site-admin" currentHref="/business/admin" />
      </header>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Service du jour</h2>
        <div className="multiline-text">
          {todayService.location ? `${todayService.location.name}\n` : ""}
          {todayService.weekdayLabel} :{" "}
          {todayService.isOpen
            ? `${todayService.opensAt} → ${todayService.closesAt}`
            : "fermé"}
        </div>
      </section>

      <BusinessSettingsAdmin initialLocations={locations} />
    </main>
  );
}
