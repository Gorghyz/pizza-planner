import Link from "next/link";

import { AutoAnalyticsSalesForm } from "@/components/business-auto-date-form";
import BusinessSectionNav from "@/components/business-navigation";
import {
  getAnalyticsDashboardData,
  getPizzaSalesAnalyticsData,
  parseAnalyticsRange,
  parsePizzaSalesDate,
  parsePizzaSalesMode,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

type BusinessAnalyticsPageProps = {
  searchParams?: Promise<{
    range?: string;
    salesMode?: string;
    salesDate?: string;
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

function RangeLink({
  range,
  currentRange,
  salesMode,
  salesDate,
}: {
  range: 7 | 30 | 90;
  currentRange: 7 | 30 | 90;
  salesMode: "day" | "week" | "month" | "year";
  salesDate: string;
}) {
  const isCurrent = range === currentRange;

  return (
    <Link
      href={`/business/analytics?range=${range}&salesMode=${salesMode}&salesDate=${salesDate}`}
      className={isCurrent ? "link-button" : "link-button secondary-link"}
      aria-current={isCurrent ? "page" : undefined}
    >
      {range} jours
    </Link>
  );
}
function formatMoney(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

function SalesModeLink({
  mode,
  currentMode,
  salesDate,
}: {
  mode: "day" | "week" | "month" | "year";
  currentMode: "day" | "week" | "month" | "year";
  salesDate: string;
}) {
  const labels = {
    day: "Jour",
    week: "Semaine",
    month: "Mois",
    year: "Année",
  };
  const isCurrent = mode === currentMode;

  return (
    <Link
      href={`/business/analytics?salesMode=${mode}&salesDate=${salesDate}`}
      className={isCurrent ? "link-button" : "link-button secondary-link"}
      aria-current={isCurrent ? "page" : undefined}
    >
      {labels[mode]}
    </Link>
  );
}

function PizzaSalesBarChart({
  rows,
}: {
  rows: { pizzaName: string; quantity: number; sharePercent: number }[];
}) {
  const maxQuantity = Math.max(...rows.map((row) => row.quantity), 0);

  if (rows.length === 0) {
    return <p className="empty compact">Aucune pizza vendue sur cette période.</p>;
  }

  return (
    <div className="analytics-bar-chart" aria-label="Pizzas les plus vendues">
      {rows.map((row) => {
        const width = maxQuantity > 0 ? Math.max((row.quantity / maxQuantity) * 100, 4) : 0;

        return (
          <div className="analytics-bar-row" key={row.pizzaName}>
            <div className="analytics-bar-label">
              <strong>{row.pizzaName}</strong>
              <span>{row.quantity} pizza{row.quantity > 1 ? "s" : ""} · {formatPercent(row.sharePercent)}</span>
            </div>
            <div className="analytics-bar-track">
              <div className="analytics-bar-fill" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeeklyWeekdayBarChart({
  rows,
}: {
  rows: { weekStart: string; weekLabel: string; friday: number; saturday: number; sunday: number; total: number }[];
}) {
  const maxValue = Math.max(...rows.flatMap((row) => [row.friday, row.saturday, row.sunday]), 0);

  if (rows.length === 0) {
    return <p className="empty compact">Aucune vente vendredi, samedi ou dimanche sur cette période.</p>;
  }

  return (
    <div className="analytics-week-chart" aria-label="Pizzas vendues par jour de la semaine">
      {rows.map((row) => (
        <div className="analytics-week-row" key={row.weekStart}>
          <div className="analytics-week-label">
            <strong>{row.weekLabel}</strong>
            <span>{row.total} pizza{row.total > 1 ? "s" : ""}</span>
          </div>
          {[
            ["Vendredi", row.friday],
            ["Samedi", row.saturday],
            ["Dimanche", row.sunday],
          ].map(([label, rawValue]) => {
            const value = Number(rawValue);
            const width = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 4 : 0) : 0;

            return (
              <div className="analytics-week-day" key={`${row.weekStart}-${label}`}>
                <span>{label}</span>
                <div className="analytics-bar-track">
                  <div className="analytics-bar-fill" style={{ width: `${width}%` }} />
                </div>
                <strong>{value}</strong>
              </div>
            );
          })}
        </div>
      ))}
    </div>
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
  const salesMode = parsePizzaSalesMode(params.salesMode);
  const salesDate = parsePizzaSalesDate(params.salesDate);
  const [data, salesData] = await Promise.all([
    getAnalyticsDashboardData(params.range),
    getPizzaSalesAnalyticsData(params.salesMode, params.salesDate),
  ]);

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
            <RangeLink range={7} currentRange={currentRange} salesMode={salesMode} salesDate={salesDate} />
            <RangeLink range={30} currentRange={currentRange} salesMode={salesMode} salesDate={salesDate} />
            <RangeLink range={90} currentRange={currentRange} salesMode={salesMode} salesDate={salesDate} />
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

      <section className="card analytics-section sales-analytics-section">
        <div className="form-header">
          <div>
            <h2>Ventes pizzas</h2>
            <p className="small">
              Commandes réellement enregistrées pour la vue cuisine, du {salesData.startDate} au {salesData.endDate}.
              Le chiffre d’affaires est estimé avec les prix actuels des pizzas.
            </p>
          </div>
          <AutoAnalyticsSalesForm
            key={`${salesMode}-${salesDate}-${currentRange}`}
            range={currentRange}
            salesMode={salesMode}
            salesDate={salesDate}
          />
        </div>

        <div className="page-actions analytics-range-actions">
          <SalesModeLink mode="day" currentMode={salesMode} salesDate={salesDate} />
          <SalesModeLink mode="week" currentMode={salesMode} salesDate={salesDate} />
          <SalesModeLink mode="month" currentMode={salesMode} salesDate={salesDate} />
          <SalesModeLink mode="year" currentMode={salesMode} salesDate={salesDate} />
        </div>

        <div className="analytics-metric-grid">
          <MetricCard label="Commandes" value={salesData.summary.orderCount} />
          <MetricCard label="Pizzas vendues" value={salesData.summary.pizzaCount} />
          <article className="business-card analytics-metric-card">
            <span className="small">CA estimé</span>
            <strong>{formatMoney(salesData.summary.estimatedRevenueCents)}</strong>
          </article>
          <article className="business-card analytics-metric-card">
            <span className="small">Panier moyen estimé</span>
            <strong>{formatMoney(salesData.summary.averageOrderRevenueCents)}</strong>
          </article>
          <article className="business-card analytics-metric-card">
            <span className="small">Pizzas / commande</span>
            <strong>{salesData.summary.averagePizzasPerOrder.toLocaleString("fr-FR")}</strong>
          </article>
          <article className="business-card analytics-metric-card">
            <span className="small">Pizza la plus vendue</span>
            <strong className="analytics-card-text-value">{salesData.summary.topPizzaName ?? "—"}</strong>
          </article>
        </div>
      </section>

      <div className="analytics-two-columns">
        <section className="card analytics-section">
          <h2>Pizzas les plus vendues</h2>
          <PizzaSalesBarChart rows={salesData.pizzas.slice(0, 12)} />
        </section>

        <section className="card analytics-section">
          <h2>Vendredi / samedi / dimanche</h2>
          <p className="small">
            Nombre de pizzas vendues, semaine par semaine, sur les jours habituels de service.
          </p>
          <WeeklyWeekdayBarChart rows={salesData.weeklyWeekdays} />
        </section>
      </div>

      <section className="card analytics-section">
        <h2>Détail des ventes par pizza</h2>
        <div className="table-scroll">
          <table className="order-table analytics-table">
            <thead>
              <tr>
                <th>Pizza</th>
                <th>Quantité</th>
                <th>Part</th>
                <th>Commandes</th>
                <th>CA estimé</th>
              </tr>
            </thead>
            <tbody>
              {salesData.pizzas.length === 0 ? (
                <EmptyRow colSpan={5} />
              ) : (
                salesData.pizzas.map((row) => (
                  <tr key={row.pizzaId}>
                    <td>{row.pizzaName}</td>
                    <td>{row.quantity}</td>
                    <td>{formatPercent(row.sharePercent)}</td>
                    <td>{row.orderCount}</td>
                    <td>{formatMoney(row.estimatedRevenueCents)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
