import BusinessSectionNav from "@/components/business-navigation";
import OrderScreen from "@/components/order-screen";
import { getActivePizzas, getOrdersForDate, getServiceSettingsForDate } from "@/lib/data";
import { formatDateLong, getParisDateString, isDateString } from "@/lib/dates";

export const dynamic = "force-dynamic";

type BusinessOrderPageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

export default async function BusinessOrderPage({ searchParams }: BusinessOrderPageProps) {
  const params = (await searchParams) ?? {};
  const requestedDate = typeof params.date === "string" ? params.date.trim() : "";
  const serviceDate = isDateString(requestedDate) ? requestedDate : getParisDateString();
  const serviceDateLabel = formatDateLong(serviceDate);

  const [pizzas, orders, service] = await Promise.all([
    getActivePizzas(),
    getOrdersForDate(serviceDate),
    getServiceSettingsForDate(serviceDate),
  ]);

  return (
    <main className="page">
      <header className="page-header">
        <h1>Prise de commande</h1>
        <p>
          Enregistre les commandes du soir et annonce immédiatement les créneaux
          disponibles au client.
        </p>

        <BusinessSectionNav section="orders" currentHref="/business/prise" />
      </header>

      <section className="card" style={{ marginBottom: 20 }}>
        <div className="form-header">
          <div>
            <h2>Service sélectionné</h2>
            <p className="small">
              Choisis une date pour préparer un service normal ou anticiper une ouverture spéciale.
            </p>
          </div>

          <form className="date-selector-form" action="/business/prise">
            <div className="field">
              <label htmlFor="service-date">Date du service</label>
              <input id="service-date" name="date" type="date" defaultValue={serviceDate} />
            </div>
            <button type="submit" className="secondary">
              Afficher
            </button>
          </form>
        </div>

        <ul className="rule-list">
          <li>Jour : {serviceDateLabel}</li>
          <li>Lieu : {service.location?.name ?? "Aucun lieu configuré"}</li>
          <li>
            Horaires : {service.isOpen ? `${service.opensAt} → ${service.closesAt}` : "Fermé"}
          </li>
          <li>Créneaux proposés toutes les 5 minutes</li>
          <li>Temps de fabrication variable selon la pizza</li>
        </ul>
      </section>

      <div className="layout-grid">
        <section className="card">
          <h2>Nouvelle commande</h2>
          {service.isOpen ? (
            <OrderScreen
              pizzas={pizzas}
              serviceDate={serviceDate}
              serviceOpeningTime={service.opensAt}
              serviceLabel={serviceDateLabel}
            />
          ) : (
            <p className="empty">
              Ce service est fermé dans les réglages habituels. Pour une ouverture spéciale,
              crée plutôt un événement dans l’administration du site.
            </p>
          )}
        </section>

        <section className="card">
          <h2>Commandes du {serviceDateLabel}</h2>

          {orders.length === 0 ? (
            <p className="empty">Aucune commande enregistrée pour cette date.</p>
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
                      {order.eventTitle ? (
                        <div className="small" style={{ marginTop: 4 }}>
                          {order.eventTitle}
                        </div>
                      ) : null}
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
