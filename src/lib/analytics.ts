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

function getParisDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
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
