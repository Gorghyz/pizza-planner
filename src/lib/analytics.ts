import { APP_TIME_ZONE } from "@/lib/config";
import { query } from "@/lib/db";

type RawCountRow = {
  label: string | null;
  page_path?: string | null;
  event_name?: string | null;
  count: string | number;
};

export type AnalyticsRange = 7 | 30 | 90;

export type AnalyticsSummary = {
  pageViews: number;
  trackedEvents: number;
  clicks: number;
  smsClicks: number;
  phoneClicks: number;
  requestClicks: number;
};

export type AnalyticsDailyRow = {
  date: string;
  pageViews: number;
  clicks: number;
  smsClicks: number;
  requestClicks: number;
};

export type AnalyticsPageRow = {
  pagePath: string;
  count: number;
};

export type AnalyticsClickRow = {
  eventName: string;
  label: string;
  pagePath: string;
  count: number;
};

export type AnalyticsScrollRow = {
  pagePath: string;
  depth: number;
  count: number;
};

export type AnalyticsPizzaRow = {
  pizzaName: string;
  action: string;
  count: number;
};

export type AnalyticsDashboardData = {
  rangeDays: AnalyticsRange;
  startDate: string;
  endDate: string;
  summary: AnalyticsSummary;
  dailyRows: AnalyticsDailyRow[];
  pages: AnalyticsPageRow[];
  clicks: AnalyticsClickRow[];
  scrollDepths: AnalyticsScrollRow[];
  pizzas: AnalyticsPizzaRow[];
};

export type SalesPeriodMode = "day" | "week" | "month" | "year";

export type PizzaSalesSummary = {
  orderCount: number;
  pizzaCount: number;
  estimatedRevenueCents: number;
  averagePizzasPerOrder: number;
  averageOrderRevenueCents: number;
  topPizzaName: string | null;
};

export type PizzaSalesRow = {
  pizzaId: number;
  pizzaName: string;
  quantity: number;
  orderCount: number;
  estimatedRevenueCents: number;
  sharePercent: number;
};

export type WeeklyWeekdaySalesRow = {
  weekStart: string;
  weekLabel: string;
  friday: number;
  saturday: number;
  sunday: number;
  total: number;
};

export type PizzaSalesAnalyticsData = {
  mode: SalesPeriodMode;
  referenceDate: string;
  startDate: string;
  endDate: string;
  summary: PizzaSalesSummary;
  pizzas: PizzaSalesRow[];
  weeklyWeekdays: WeeklyWeekdaySalesRow[];
};

function getParisDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDaysToDateString(dateString: string, offsetDays: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offsetDays, 12, 0, 0));

  return date.toISOString().slice(0, 10);
}

function toCount(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function normalizeRangeDays(value: string | undefined): AnalyticsRange {
  if (value === "30") {
    return 30;
  }

  if (value === "90") {
    return 90;
  }

  return 7;
}

export function parseAnalyticsRange(value: string | undefined): AnalyticsRange {
  return normalizeRangeDays(value);
}

export async function getAnalyticsDashboardData(
  requestedRange: string | undefined,
): Promise<AnalyticsDashboardData> {
  const rangeDays = normalizeRangeDays(requestedRange);
  const endDate = getParisDateString();
  const startDate = addDaysToDateString(endDate, -(rangeDays - 1));

  const [summaryResult, dailyResult, pagesResult, clicksResult, scrollResult, pizzaResult] =
    await Promise.all([
      query<{
        page_views: string;
        tracked_events: string;
        clicks: string;
        sms_clicks: string;
        phone_clicks: string;
        request_clicks: string;
      }>(
        `
          SELECT
            COUNT(*) FILTER (WHERE event_name = 'page_view')::text AS page_views,
            COUNT(*)::text AS tracked_events,
            COUNT(*) FILTER (WHERE event_name <> 'page_view' AND event_name <> 'scroll_depth')::text AS clicks,
            COUNT(*) FILTER (WHERE event_name = 'sms_click')::text AS sms_clicks,
            COUNT(*) FILTER (WHERE event_name = 'phone_click')::text AS phone_clicks,
            COUNT(*) FILTER (WHERE event_name = 'request_submit_click')::text AS request_clicks
          FROM analytics_events
          WHERE event_date BETWEEN $1::date AND $2::date
        `,
        [startDate, endDate],
      ),
      query<{
        event_date: string;
        page_views: string;
        clicks: string;
        sms_clicks: string;
        request_clicks: string;
      }>(
        `
          SELECT
            event_date::text,
            COUNT(*) FILTER (WHERE event_name = 'page_view')::text AS page_views,
            COUNT(*) FILTER (WHERE event_name <> 'page_view' AND event_name <> 'scroll_depth')::text AS clicks,
            COUNT(*) FILTER (WHERE event_name = 'sms_click')::text AS sms_clicks,
            COUNT(*) FILTER (WHERE event_name = 'request_submit_click')::text AS request_clicks
          FROM analytics_events
          WHERE event_date BETWEEN $1::date AND $2::date
          GROUP BY event_date
          ORDER BY event_date DESC
        `,
        [startDate, endDate],
      ),
      query<RawCountRow>(
        `
          SELECT page_path AS label, COUNT(*)::text AS count
          FROM analytics_events
          WHERE event_date BETWEEN $1::date AND $2::date
            AND event_name = 'page_view'
          GROUP BY page_path
          ORDER BY COUNT(*) DESC, page_path
          LIMIT 20
        `,
        [startDate, endDate],
      ),
      query<{
        event_name: string;
        label: string | null;
        page_path: string;
        count: string;
      }>(
        `
          SELECT
            event_name,
            COALESCE(NULLIF(metadata->>'label', ''), NULLIF(metadata->>'target', ''), 'Sans libellé') AS label,
            page_path,
            COUNT(*)::text AS count
          FROM analytics_events
          WHERE event_date BETWEEN $1::date AND $2::date
            AND event_name <> 'page_view'
            AND event_name <> 'scroll_depth'
          GROUP BY event_name, label, page_path
          ORDER BY COUNT(*) DESC, event_name, label
          LIMIT 35
        `,
        [startDate, endDate],
      ),
      query<{
        page_path: string;
        depth: string;
        count: string;
      }>(
        `
          SELECT
            page_path,
            COALESCE(metadata->>'depth', '0') AS depth,
            COUNT(*)::text AS count
          FROM analytics_events
          WHERE event_date BETWEEN $1::date AND $2::date
            AND event_name = 'scroll_depth'
          GROUP BY page_path, COALESCE(metadata->>'depth', '0')
          ORDER BY page_path, (COALESCE(metadata->>'depth', '0'))::int
        `,
        [startDate, endDate],
      ),
      query<{
        pizza_name: string | null;
        action: string;
        count: string;
      }>(
        `
          SELECT
            COALESCE(NULLIF(metadata->>'pizzaName', ''), 'Pizza non renseignée') AS pizza_name,
            CASE event_name
              WHEN 'pizza_add' THEN 'Ajoutée'
              WHEN 'pizza_remove' THEN 'Retirée'
              ELSE event_name
            END AS action,
            COUNT(*)::text AS count
          FROM analytics_events
          WHERE event_date BETWEEN $1::date AND $2::date
            AND event_name IN ('pizza_add', 'pizza_remove')
          GROUP BY pizza_name, action
          ORDER BY COUNT(*) DESC, pizza_name
          LIMIT 25
        `,
        [startDate, endDate],
      ),
    ]);

  const summaryRow = summaryResult.rows[0];

  return {
    rangeDays,
    startDate,
    endDate,
    summary: {
      pageViews: Number(summaryRow?.page_views ?? 0),
      trackedEvents: Number(summaryRow?.tracked_events ?? 0),
      clicks: Number(summaryRow?.clicks ?? 0),
      smsClicks: Number(summaryRow?.sms_clicks ?? 0),
      phoneClicks: Number(summaryRow?.phone_clicks ?? 0),
      requestClicks: Number(summaryRow?.request_clicks ?? 0),
    },
    dailyRows: dailyResult.rows.map((row) => ({
      date: row.event_date,
      pageViews: Number(row.page_views),
      clicks: Number(row.clicks),
      smsClicks: Number(row.sms_clicks),
      requestClicks: Number(row.request_clicks),
    })),
    pages: pagesResult.rows.map((row) => ({
      pagePath: row.label ?? "Inconnue",
      count: toCount(row.count),
    })),
    clicks: clicksResult.rows.map((row) => ({
      eventName: row.event_name,
      label: row.label ?? "Sans libellé",
      pagePath: row.page_path,
      count: Number(row.count),
    })),
    scrollDepths: scrollResult.rows.map((row) => ({
      pagePath: row.page_path,
      depth: Number(row.depth),
      count: Number(row.count),
    })),
    pizzas: pizzaResult.rows.map((row) => ({
      pizzaName: row.pizza_name ?? "Pizza non renseignée",
      action: row.action,
      count: Number(row.count),
    })),
  };
}


function isValidDateString(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return date.toISOString().slice(0, 10) === value;
}

function normalizeSalesMode(value: string | undefined): SalesPeriodMode {
  if (value === "week" || value === "month" || value === "year") {
    return value;
  }

  return "day";
}

function getMondayOfWeek(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const isoDay = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (isoDay - 1));

  return date.toISOString().slice(0, 10);
}

function getStartOfMonth(dateString: string): string {
  return `${dateString.slice(0, 7)}-01`;
}

function getStartOfYear(dateString: string): string {
  return `${dateString.slice(0, 4)}-01-01`;
}

function getSalesPeriod(mode: SalesPeriodMode, referenceDate: string) {
  if (mode === "week") {
    const startDate = getMondayOfWeek(referenceDate);
    return {
      startDate,
      endDate: addDaysToDateString(startDate, 6),
    };
  }

  if (mode === "month") {
    const startDate = getStartOfMonth(referenceDate);
    const [year, month] = startDate.split("-").map(Number);
    const nextMonth = new Date(Date.UTC(year, month, 1, 12, 0, 0));
    const endDate = addDaysToDateString(nextMonth.toISOString().slice(0, 10), -1);

    return { startDate, endDate };
  }

  if (mode === "year") {
    const startDate = getStartOfYear(referenceDate);
    const endDate = `${referenceDate.slice(0, 4)}-12-31`;

    return { startDate, endDate };
  }

  return {
    startDate: referenceDate,
    endDate: referenceDate,
  };
}

function formatWeekLabel(weekStart: string): string {
  const endDate = addDaysToDateString(weekStart, 6);
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  });

  const [startYear, startMonth, startDay] = weekStart.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const start = new Date(Date.UTC(startYear, startMonth - 1, startDay, 12, 0, 0));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay, 12, 0, 0));

  return `${formatter.format(start)} → ${formatter.format(end)}`;
}

export function parsePizzaSalesMode(value: string | undefined): SalesPeriodMode {
  return normalizeSalesMode(value);
}

export function parsePizzaSalesDate(value: string | undefined): string {
  return isValidDateString(value) ? value : getParisDateString();
}

export async function getPizzaSalesAnalyticsData(
  requestedMode: string | undefined,
  requestedDate: string | undefined,
): Promise<PizzaSalesAnalyticsData> {
  const mode = normalizeSalesMode(requestedMode);
  const referenceDate = parsePizzaSalesDate(requestedDate);
  const { startDate, endDate } = getSalesPeriod(mode, referenceDate);

  const [summaryResult, pizzasResult, weeklyResult] = await Promise.all([
    query<{
      order_count: string;
      pizza_count: string;
      estimated_revenue_cents: string;
    }>(
      `
        SELECT
          COUNT(DISTINCT o.id)::text AS order_count,
          COALESCE(SUM(oi.quantity), 0)::text AS pizza_count,
          COALESCE(SUM(oi.quantity * p.price_cents), 0)::text AS estimated_revenue_cents
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN pizzas p ON p.id = oi.pizza_id
        WHERE o.service_date BETWEEN $1::date AND $2::date
      `,
      [startDate, endDate],
    ),
    query<{
      pizza_id: number;
      pizza_name: string;
      quantity: string;
      order_count: string;
      estimated_revenue_cents: string;
    }>(
      `
        SELECT
          p.id AS pizza_id,
          p.name AS pizza_name,
          SUM(oi.quantity)::text AS quantity,
          COUNT(DISTINCT o.id)::text AS order_count,
          COALESCE(SUM(oi.quantity * p.price_cents), 0)::text AS estimated_revenue_cents
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN pizzas p ON p.id = oi.pizza_id
        WHERE o.service_date BETWEEN $1::date AND $2::date
        GROUP BY p.id, p.name, p.display_order
        ORDER BY SUM(oi.quantity) DESC, p.display_order, p.name
        LIMIT 30
      `,
      [startDate, endDate],
    ),
    query<{
      week_start: string;
      friday: string;
      saturday: string;
      sunday: string;
      total: string;
    }>(
      `
        SELECT
          DATE_TRUNC('week', o.service_date)::date::text AS week_start,
          COALESCE(SUM(oi.quantity) FILTER (WHERE EXTRACT(ISODOW FROM o.service_date) = 5), 0)::text AS friday,
          COALESCE(SUM(oi.quantity) FILTER (WHERE EXTRACT(ISODOW FROM o.service_date) = 6), 0)::text AS saturday,
          COALESCE(SUM(oi.quantity) FILTER (WHERE EXTRACT(ISODOW FROM o.service_date) = 7), 0)::text AS sunday,
          COALESCE(SUM(oi.quantity) FILTER (WHERE EXTRACT(ISODOW FROM o.service_date) IN (5, 6, 7)), 0)::text AS total
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.service_date BETWEEN $1::date AND $2::date
          AND EXTRACT(ISODOW FROM o.service_date) IN (5, 6, 7)
        GROUP BY DATE_TRUNC('week', o.service_date)::date
        ORDER BY DATE_TRUNC('week', o.service_date)::date DESC
      `,
      [startDate, endDate],
    ),
  ]);

  const summaryRow = summaryResult.rows[0];
  const orderCount = Number(summaryRow?.order_count ?? 0);
  const pizzaCount = Number(summaryRow?.pizza_count ?? 0);
  const estimatedRevenueCents = Number(summaryRow?.estimated_revenue_cents ?? 0);

  const pizzas = pizzasResult.rows.map((row) => {
    const quantity = Number(row.quantity);

    return {
      pizzaId: row.pizza_id,
      pizzaName: row.pizza_name,
      quantity,
      orderCount: Number(row.order_count),
      estimatedRevenueCents: Number(row.estimated_revenue_cents),
      sharePercent: pizzaCount > 0 ? Math.round((quantity / pizzaCount) * 1000) / 10 : 0,
    };
  });

  return {
    mode,
    referenceDate,
    startDate,
    endDate,
    summary: {
      orderCount,
      pizzaCount,
      estimatedRevenueCents,
      averagePizzasPerOrder: orderCount > 0 ? Math.round((pizzaCount / orderCount) * 100) / 100 : 0,
      averageOrderRevenueCents:
        orderCount > 0 ? Math.round(estimatedRevenueCents / orderCount) : 0,
      topPizzaName: pizzas[0]?.pizzaName ?? null,
    },
    pizzas,
    weeklyWeekdays: weeklyResult.rows.map((row) => ({
      weekStart: row.week_start,
      weekLabel: formatWeekLabel(row.week_start),
      friday: Number(row.friday),
      saturday: Number(row.saturday),
      sunday: Number(row.sunday),
      total: Number(row.total),
    })),
  };
}
