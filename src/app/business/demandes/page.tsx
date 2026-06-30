import BusinessSectionNav from "@/components/business-navigation";
import CustomerRequestBoard from "@/components/customer-request-board";
import { getCustomerRequests } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BusinessRequestsPage() {
  const requests = await getCustomerRequests();

  return (
    <main className="page">
      <header className="page-header">
        <h1>Demandes clients</h1>
        <p>
          Consulte les demandes envoyées depuis ordinateur, puis confirme-les
          manuellement par appel ou SMS.
        </p>

        <BusinessSectionNav section="orders" currentHref="/business/demandes" />
      </header>

      <CustomerRequestBoard requests={requests} />
    </main>
  );
}
