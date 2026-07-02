import { AutoServiceDateForm } from "@/components/business-auto-date-form";
import BusinessSectionNav from "@/components/business-navigation";
import KitchenBoard from "@/components/kitchen-board";
import { getOrdersForDate } from "@/lib/data";
import { formatDateLong, getParisDateString, isDateString } from "@/lib/dates";

export const dynamic = "force-dynamic";

type BusinessKitchenPageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

export default async function BusinessKitchenPage({ searchParams }: BusinessKitchenPageProps) {
  const params = (await searchParams) ?? {};
  const requestedDate = typeof params.date === "string" ? params.date.trim() : "";
  const serviceDate = isDateString(requestedDate) ? requestedDate : getParisDateString();
  const serviceDateLabel = formatDateLong(serviceDate);
  const orders = await getOrdersForDate(serviceDate);

  return (
    <main className="page kitchen-page">
      <header className="page-header">
        <h1>Vue cuisine</h1>
        <p>
          Affichage des commandes par date de service, triées par heure promise,
          avec mise à jour du statut.
        </p>

        <BusinessSectionNav section="orders" currentHref="/business/cuisine" />
      </header>

      <section className="card" style={{ marginBottom: 20 }}>
        <div className="form-header">
          <div>
            <h2>Commandes du {serviceDateLabel}</h2>
            <p className="small">Sélectionne une autre date pour préparer un service futur.</p>
          </div>

          <AutoServiceDateForm
            key={serviceDate}
            actionPath="/business/cuisine"
            value={serviceDate}
            label="Date du service"
          />
        </div>
      </section>

      <KitchenBoard orders={orders} serviceDateLabel={serviceDateLabel} />
    </main>
  );
}
