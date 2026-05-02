import Link from "next/link";

import PublicCarteBuilder from "@/components/public-carte-builder";
import PublicOpeningInfo from "@/components/public-opening-info";
import PublicSiteShell from "@/components/public-site-shell";
import {
  getActivePizzas,
  getPublicLocationsWithHours,
  getTodayServiceSettings,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CartePage() {
  const [pizzas, locations, todayService] = await Promise.all([
    getActivePizzas(),
    getPublicLocationsWithHours(),
    getTodayServiceSettings(),
  ]);

  return (
    <PublicSiteShell currentPage="carte">
      <header className="page-header">
        <h1>La carte des pizzas</h1>
        <p>
          Choisissez vos pizzas, indiquez l&apos;heure souhaitée, puis
          sélectionnez un créneau disponible. Les horaires et lieux affichés
          ci-dessous sont ceux actuellement publiés.
        </p>

        <div className="page-actions">
          <Link href="/" className="link-button secondary-link">
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <PublicOpeningInfo locations={locations} todayService={todayService} />

      <div style={{ marginTop: 24 }}>
        <PublicCarteBuilder pizzas={pizzas} />
      </div>
    </PublicSiteShell>
  );
}