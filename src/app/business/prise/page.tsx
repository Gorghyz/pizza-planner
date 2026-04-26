import Link from "next/link";
import OrderScreen from "@/components/order-screen";
import {
  SERVICE_CLOSING_TIME,
  SERVICE_OPENING_TIME,
} from "@/lib/config";
import { getActivePizzas, getTodayOrders } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BusinessOrderPage() {
  const [pizzas, orders] = await Promise.all([
    getActivePizzas(),
    getTodayOrders(),
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
          <Link href="/admin/pizzas" className="link-button secondary-link">
            Admin carte
          </Link>
        </div>
      </header>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Règles actuelles</h2>
        <ul className="rule-list">
          <li>Service du soir : {SERVICE_OPENING_TIME} → {SERVICE_CLOSING_TIME}</li>
          <li>Créneaux proposés toutes les 5 minutes</li>
          <li>Temps de fabrication variable selon la pizza</li>
          <li>
            Modèle actuel : une seule chaîne de production, sans décalage
            automatique des commandes déjà prises
          </li>
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