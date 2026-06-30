import BusinessEventAdmin from "@/components/business-event-admin";
import BusinessSectionNav from "@/components/business-navigation";
import { getAllPizzasForAdmin, getBusinessLocations } from "@/lib/data";
import { getBusinessEventsForAdmin } from "@/lib/events";

export const dynamic = "force-dynamic";

type BusinessEventsPageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

function isDateString(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default async function BusinessEventsPage({
  searchParams,
}: BusinessEventsPageProps) {
  const params = (await searchParams) ?? {};
  const initialDate = isDateString(params.date) ? params.date : "";
  const [events, pizzas, locations] = await Promise.all([
    getBusinessEventsForAdmin(),
    getAllPizzasForAdmin(),
    getBusinessLocations(),
  ]);

  return (
    <main className="page">
      <header className="page-header">
        <h1>Événements et ouvertures spéciales</h1>
        <p>
          Prépare les soirées spéciales, leurs horaires, leurs images, leur carte
          dédiée et l’ouverture des précommandes.
        </p>

        <BusinessSectionNav section="site-admin" currentHref="/business/evenements" />
      </header>

      <BusinessEventAdmin
        initialEvents={events}
        pizzas={pizzas}
        locations={locations}
        initialDate={initialDate}
      />
    </main>
  );
}
