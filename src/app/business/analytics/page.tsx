import Link from "next/link";

import BusinessSectionNav from "@/components/business-navigation";
import { getAnalyticsDashboardData, parseAnalyticsRange } from "@/lib/analytics";

export const dynamic = "force-dynamic";

type BusinessAnalyticsPageProps = {
  searchParams?: Promise<{
    range?: string;
  }>;
};

type MetricCardProps = {
  label: string;
  value: number;
  help?: string;
};

function MetricCard({ label, value, help }: MetricCardProps) {
  return (
    <article className="business-card analytics-metric-card">
      <span className="small">{label}</span>
      <strong>{value.toLocaleString("fr-FR")}</strong>
      {help ? <p>{help}</p> : null}
    </article>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-table-cell">
        Aucune donnée pour cette période.
      </td>
    </tr>
  );
}

function RangeLink({ range, currentRange }: { range: 7 | 30 | 90; currentRange: 7 | 30 | 90 }) {
  const isCurrent = range === currentRange;

  return (
    <Link
      href={`/business/analytics?range=${range}`}
      className={isCurrent ? "link-button" : "link-button secondary-link"}
      aria-current={isCurrent ? "page" : undefined}
    >
      {range} jours
    </Link>
  );
}

function eventNameLabel(eventName: string): string {
  const labels: Record<string, string> = {
    closure_notice_click: "Clic fermeture",
    event_callout_click: "Clic événement",
    external_click: "Clic externe",
    footer_click: "Clic pied de page",
    home_cta_click: "Clic accueil",
    home_feature_click: "Clic bloc accueil",
    home_hero_click: "Clic image accueil",
    home_illustration_click: "Clic illustration accueil",
    map_click: "Clic carte / itinéraire",
    nav_click: "Clic navigation",
    phone_click: "Clic téléphone",
    pizza_add: "Pizza ajoutée",
    pizza_remove: "Pizza retirée",
    request_submit_click: "Clic demande web",
    sms_click: "Clic SMS",
    sms_copy_click: "Copie SMS",
    week_event_click: "Clic événement semaine",
  };

  return labels[eventName] ?? eventName;
}

export default async function BusinessAnalyticsPage({ searchParams }: BusinessAnalyticsPageProps) {
  const params = (await searchParams) ?? {};
  const currentRange = parseAnalyticsRange(params.range);
  const data = await getAnalyticsDashboardData(params.range);

  return (
    <main className="page">
      <header className="page-header">
        <h1>Analytics</h1>
        <p>
          Vue globale et agrégée de la fréquentation du site. Aucun cookie analytics,
          aucun identifiant visiteur, aucune adresse IP stockée.
        </p>

        <BusinessSectionNav section="site-admin" currentHref="/business/analytics" />
      </header>

      <section className="card analytics-section">
        <div className="form-header">
          <div>
            <h2>Période</h2>
            <p className="small">
              Données du {data.startDate} au {data.endDate}, agrégées par jour.
            </p>
          </div>
          <div className="page-actions analytics-range-actions">
            <RangeLink range={7} currentRange={currentRange} />
            <RangeLink range={30} currentRange={currentRange} />
            <RangeLink range={90} currentRange={currentRange} />
          </div>
        </div>

        <div className="analytics-metric-grid">
          <MetricCard label="Pages vues" value={data.summary.pageViews} />
          <MetricCard label="Événements enregistrés" value={data.summary.trackedEvents} />
          <MetricCard label="Clics suivis" value={data.summary.clicks} />
          <MetricCard label="Clics SMS" value={data.summary.smsClicks} />
          <MetricCard label="Clics téléphone" value={data.summary.phoneClicks} />
          <MetricCard label="Demandes web" value={data.summary.requestClicks} />
        </div>
      </section>

      <section className="card analytics-section">
        <h2>Évolution quotidienne</h2>
        <div className="table-scroll">
          <table className="order-table analytics-table">
            <thead>
              <tr>
                <th>Jour</th>
                <th>Pages vues</th>
                <th>Clics</th>
                <th>SMS</th>
                <th>Demandes web</th>
              </tr>
            </thead>
            <tbody>
              {data.dailyRows.length === 0 ? (
                <EmptyRow colSpan={5} />
              ) : (
                data.dailyRows.map((row) => (
                  <tr key={row.date}>
                    <td>{row.date}</td>
                    <td>{row.pageViews}</td>
                    <td>{row.clicks}</td>
                    <td>{row.smsClicks}</td>
                    <td>{row.requestClicks}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="analytics-two-columns">
        <section className="card analytics-section">
          <h2>Pages les plus vues</h2>
          <div className="table-scroll">
            <table className="order-table analytics-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Vues</th>
                </tr>
              </thead>
              <tbody>
                {data.pages.length === 0 ? (
                  <EmptyRow colSpan={2} />
                ) : (
                  data.pages.map((row) => (
                    <tr key={row.pagePath}>
                      <td>{row.pagePath}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card analytics-section">
          <h2>Clics principaux</h2>
          <div className="table-scroll">
            <table className="order-table analytics-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Libellé</th>
                  <th>Page</th>
                  <th>Clics</th>
                </tr>
              </thead>
              <tbody>
                {data.clicks.length === 0 ? (
                  <EmptyRow colSpan={4} />
                ) : (
                  data.clicks.map((row) => (
                    <tr key={`${row.eventName}-${row.label}-${row.pagePath}`}>
                      <td>{eventNameLabel(row.eventName)}</td>
                      <td>{row.label}</td>
                      <td>{row.pagePath}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="analytics-two-columns">
        <section className="card analytics-section">
          <h2>Scroll</h2>
          <p className="small">
            Nombre de fois où les visiteurs ont atteint 25 %, 50 %, 75 % ou 100 % d’une page.
          </p>
          <div className="table-scroll">
            <table className="order-table analytics-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Profondeur</th>
                  <th>Occurrences</th>
                </tr>
              </thead>
              <tbody>
                {data.scrollDepths.length === 0 ? (
                  <EmptyRow colSpan={3} />
                ) : (
                  data.scrollDepths.map((row) => (
                    <tr key={`${row.pagePath}-${row.depth}`}>
                      <td>{row.pagePath}</td>
                      <td>{row.depth} %</td>
                      <td>{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card analytics-section">
          <h2>Interactions avec les pizzas</h2>
          <div className="table-scroll">
            <table className="order-table analytics-table">
              <thead>
                <tr>
                  <th>Pizza</th>
                  <th>Action</th>
                  <th>Nombre</th>
                </tr>
              </thead>
              <tbody>
                {data.pizzas.length === 0 ? (
                  <EmptyRow colSpan={3} />
                ) : (
                  data.pizzas.map((row) => (
                    <tr key={`${row.pizzaName}-${row.action}`}>
                      <td>{row.pizzaName}</td>
                      <td>{row.action}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
