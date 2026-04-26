import Link from "next/link";
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
        </div>
      </header>

      <CustomerRequestBoard requests={requests} />
    </main>
  );
}