import BusinessSectionNav from "@/components/business-navigation";
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

        <BusinessSectionNav section="orders" currentHref="/business/cuisine" />
      </header>

      <KitchenBoard orders={orders} />
    </main>
  );
}
