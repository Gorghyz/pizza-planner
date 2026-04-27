import Link from "next/link";
import BusinessLogoutButton from "@/components/business-logout-button";
import OrderScreen from "@/components/order-screen";
import { getActivePizzas, getTodayOrders, getTodayServiceSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BusinessOrderPage() {
  const [pizzas, orders, todayService] = await Promise.all([
    getActivePizzas(),
    getTodayOrders(),
    getTodayServiceSettings(),
  ]);

  return (
    <main className="page">
      <header className="page-header">
        <h1>Prise de commande</h1>
        <p>
          Enregistre les commandes du soir et annonce immédiatement les créneaux
          disponibles au client.
        </p>

        <div className="page-actions">
          <Link href="/business" className="link-button secondary-link">
            Accueil business
          </Link>
          <Link href="/business/cuisine" className="link-button">
            Vue cuisine
          </Link>
          <Link href="/business/admin" className="link-button secondary-link">
            Réglages business
          </Link>
          <Link href="/admin/pizzas" className="link-button secondary-link">
            Admin carte
          </Link>
          <BusinessLogoutButton />
        </div>
      </header>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Service du jour</h2>
        <ul className="rule-list">
          <li>
            Lieu : {todayService.location?.name ?? "Aucun lieu configuré"}
          </li>
          <li>Jour : {todayService.weekdayLabel}</li>
          <li>
            Horaires :{" "}
            {todayService.isOpen
              ? `${todayService.opensAt} → ${todayService.closesAt}`
              : "Fermé aujourd'hui"}
          </li>
          <li>Créneaux proposés toutes les 5 minutes</li>
          <li>Temps de fabrication variable selon la pizza</li>
        </ul>
      </section>

      <div className="layout-grid">
        <section className="card">
          <h2>Nouvelle commande</h2>
          <OrderScreen pizzas={pizzas} />
        </section>

        <section className="card">
          <h2>Commandes du jour</h2>

          {orders.length === 0 ? (
            <p className="empty">
              Aucune commande enregistrée pour aujourd&apos;hui.
            </p>
          ) : (
            <table className="order-table">
              <thead>
                <tr>
                  <th>Heure promise</th>
                  <th>Client</th>
                  <th>Détail</th>
                  <th>Charge</th>
                  <th>Souhaitée</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.promisedTime}</strong>
                    </td>
                    <td>{order.customerName}</td>
                    <td>
                      <div>{order.itemSummary}</div>
                      {order.notes ? (
                        <div className="small" style={{ marginTop: 6 }}>
                          Note : {order.notes}
                        </div>
                      ) : null}
                    </td>
                    <td>{order.totalMinutes} min</td>
                    <td>{order.desiredTime}</td>
                    <td>
                      <span className={`status-pill status-${order.status.replace("_", "-")}`}>
                        {order.status === "new"
                          ? "À faire"
                          : order.status === "in_progress"
                            ? "En cours"
                            : order.status === "ready"
                              ? "Prête"
                              : "Remise"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}