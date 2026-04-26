import Link from "next/link";
import KitchenBoard from "@/components/kitchen-board";
import { getTodayOrders } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BusinessKitchenPage() {
  const orders = await getTodayOrders();

  return (
    <main className="page kitchen-page">
      <header className="page-header">
        <h1>Vue cuisine</h1>
        <p>
          Affichage des commandes du jour, triées par heure promise, avec mise à
          jour du statut.
        </p>

        <div className="page-actions">
          <Link href="/business" className="link-button secondary-link">
            Accueil business
          </Link>
          <Link href="/business/prise" className="link-button">
            Prise de commande
          </Link>
        </div>
      </header>

      <KitchenBoard orders={orders} />
    </main>
  );
}