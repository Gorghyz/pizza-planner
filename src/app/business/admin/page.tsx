import Link from "next/link";
import BusinessLogoutButton from "@/components/business-logout-button";
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

        <div className="page-actions">
          <Link href="/business" className="link-button secondary-link">
            Accueil business
          </Link>
          <Link href="/business/prise" className="link-button">
            Prise de commande
          </Link>
          <Link href="/business/cuisine" className="link-button secondary-link">
            Vue cuisine
          </Link>
          <Link
            href="/business/admin/image-accueil"
            className="link-button secondary-link"
          >
            Image d&apos;accueil
          </Link>
          <BusinessLogoutButton />
        </div>
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