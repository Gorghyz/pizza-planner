"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type SalesMode = "day" | "week" | "month" | "year";

type AutoServiceDateFormProps = {
  actionPath: string;
  value: string;
  label: string;
  help?: string;
};

export function AutoServiceDateForm({
  actionPath,
  value,
  label,
  help,
}: AutoServiceDateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeDate(nextDate: string) {
    if (!nextDate) {
      return;
    }

    const params = new URLSearchParams({ date: nextDate });

    startTransition(() => {
      router.push(`${actionPath}?${params.toString()}`);
    });
  }

  return (
    <div className="date-selector-form auto-date-selector-form">
      <div className="field">
        <label htmlFor="service-date">{label}</label>
        <input
          id="service-date"
          name="date"
          type="date"
          defaultValue={value}
          onChange={(event) => changeDate(event.currentTarget.value)}
        />
        {help ? <p className="small">{help}</p> : null}
      </div>
      {isPending ? <span className="small">Chargement…</span> : null}
    </div>
  );
}

type AutoAnalyticsSalesFormProps = {
  range: number;
  salesMode: SalesMode;
  salesDate: string;
};

export function AutoAnalyticsSalesForm({
  range,
  salesMode,
  salesDate,
}: AutoAnalyticsSalesFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function update(nextValues: Partial<{ salesMode: SalesMode; salesDate: string }>) {
    const nextMode = nextValues.salesMode ?? salesMode;
    const nextDate = nextValues.salesDate ?? salesDate;

    if (!nextDate) {
      return;
    }

    const params = new URLSearchParams({
      range: String(range),
      salesMode: nextMode,
      salesDate: nextDate,
    });

    startTransition(() => {
      router.push(`/business/analytics?${params.toString()}`);
    });
  }

  return (
    <div className="analytics-sales-form auto-analytics-sales-form">
      <label>
        Période
        <select
          name="salesMode"
          defaultValue={salesMode}
          onChange={(event) => update({ salesMode: event.currentTarget.value as SalesMode })}
        >
          <option value="day">Jour</option>
          <option value="week">Semaine</option>
          <option value="month">Mois</option>
          <option value="year">Année</option>
        </select>
      </label>
      <label>
        Date de référence
        <input
          type="date"
          name="salesDate"
          defaultValue={salesDate}
          onChange={(event) => update({ salesDate: event.currentTarget.value })}
        />
      </label>
      {isPending ? <span className="small">Chargement…</span> : null}
    </div>
  );
}
