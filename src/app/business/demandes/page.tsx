import BusinessSectionNav from "@/components/business-navigation";
import CustomerRequestBoard from "@/components/customer-request-board";
import { getCustomerRequests } from "@/lib/data";
import { getParisDateString } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function BusinessRequestsPage() {
  const [requests, todayDate] = await Promise.all([
    getCustomerRequests(),
    getParisDateString(),
  ]);

  return (
    <main className="page">
      <header className="page-header">
        <h1>Demandes clients</h1>
        <p>
          Consulte les demandes classiques du jour et les précommandes web des
          événements à venir. Les anciennes demandes restent en base, mais ne
          sont pas affichées ici.
        </p>

        <BusinessSectionNav section="orders" currentHref="/business/demandes" />
      </header>

      <CustomerRequestBoard requests={requests} todayDate={todayDate} />
    </main>
  );
}
