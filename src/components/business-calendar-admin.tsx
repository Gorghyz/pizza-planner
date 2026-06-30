"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { WEEKDAYS } from "@/lib/business-settings";
import type {
  BusinessCalendarDay,
  BusinessCalendarExceptionStatus,
  OpeningHour,
} from "@/lib/types";

type BusinessCalendarAdminProps = {
  days: BusinessCalendarDay[];
  monthLabel: string;
  monthValue: string;
  previousMonth: string;
  nextMonth: string;
  defaultLocationId: number | null;
  defaultLocationName: string;
  normalWeekHours: OpeningHour[];
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
};

type HoursResponse = {
  ok?: boolean;
  error?: string;
  hours?: OpeningHour[];
};

type WeekHourRow = {
  isoWeekday: number;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
};

const WEEKDAY_HEADINGS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DEFAULT_OPENING_TIME = "18:30";
const DEFAULT_CLOSING_TIME = "21:30";

function getSelectionLabel(selectedDays: BusinessCalendarDay[]): string {
  if (selectedDays.length === 0) {
    return "Aucune date sélectionnée";
  }

  if (selectedDays.length === 1) {
    return selectedDays[0].dateLabel;
  }

  const sorted = [...selectedDays].sort((a, b) => a.date.localeCompare(b.date));

  return `${selectedDays.length} dates sélectionnées · ${sorted[0].dateLabel} → ${sorted[sorted.length - 1].dateLabel}`;
}

function getDayStatusLabel(day: BusinessCalendarDay): string {
  if (day.exception?.status === "note") {
    return day.exception.title || "Note";
  }

  if (day.exception?.status === "closed") {
    return day.exception.title || "Fermeture";
  }

  if (day.exception?.status === "open") {
    return day.exception.title || "Ouverture";
  }

  return day.baseIsOpen ? "Ouvert" : "Fermé";
}

function getSelectedDates(selectedDateSet: Set<string>): string[] {
  return [...selectedDateSet].sort((a, b) => a.localeCompare(b));
}

function buildWeekRows(hours: OpeningHour[]): WeekHourRow[] {
  return WEEKDAYS.map((weekday) => {
    const hour = hours.find((entry) => entry.isoWeekday === weekday.value);

    return {
      isoWeekday: weekday.value,
      isOpen: hour?.isOpen ?? true,
      opensAt: hour?.opensAt ?? DEFAULT_OPENING_TIME,
      closesAt: hour?.closesAt ?? DEFAULT_CLOSING_TIME,
    };
  });
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error(`Réponse vide du serveur. Statut HTTP : ${response.status}.`);
  }

  return JSON.parse(raw) as T;
}

export default function BusinessCalendarAdmin({
  days,
  monthLabel,
  monthValue,
  previousMonth,
  nextMonth,
  defaultLocationId,
  defaultLocationName,
  normalWeekHours,
}: BusinessCalendarAdminProps) {
  const router = useRouter();
  const [selectedDateSet, setSelectedDateSet] = useState<Set<string>>(
    () => new Set(days[0]?.date ? [days[0].date] : []),
  );
  const [dragAnchorDate, setDragAnchorDate] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [normalWeekRows, setNormalWeekRows] = useState<WeekHourRow[]>(
    () => buildWeekRows(normalWeekHours),
  );
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNormalWeek, setIsSavingNormalWeek] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setNormalWeekRows(buildWeekRows(normalWeekHours));
  }, [normalWeekHours]);

  const dayByDate = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days],
  );

  const selectedDays = useMemo(
    () => getSelectedDates(selectedDateSet).map((date) => dayByDate.get(date)).filter((day): day is BusinessCalendarDay => Boolean(day)),
    [dayByDate, selectedDateSet],
  );

  const selectedDates = useMemo(
    () => selectedDays.map((day) => day.date),
    [selectedDays],
  );

  const eventCreationDate = selectedDates.length === 1 ? selectedDates[0] : "";

  function clearMessages() {
    setMessage("");
    setErrorMessage("");
  }

  function selectSingleDate(date: string) {
    setSelectedDateSet(new Set([date]));
    clearMessages();
  }

  function toggleDate(date: string) {
    setSelectedDateSet((previous) => {
      const next = new Set(previous);

      if (next.has(date) && next.size > 1) {
        next.delete(date);
      } else {
        next.add(date);
      }

      return next;
    });
    clearMessages();
  }

  function selectRange(anchorDate: string, targetDate: string) {
    const startIndex = days.findIndex((day) => day.date === anchorDate);
    const endIndex = days.findIndex((day) => day.date === targetDate);

    if (startIndex < 0 || endIndex < 0) {
      return;
    }

    const [start, end] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    const next = new Set(days.slice(start, end + 1).map((day) => day.date));

    setSelectedDateSet(next);
    clearMessages();
  }

  function handlePointerDown(date: string, event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragAnchorDate(date);
    setIsDragging(true);

    if (event.ctrlKey || event.metaKey) {
      toggleDate(date);
    } else if (event.shiftKey && selectedDates.length > 0) {
      selectRange(selectedDates[0], date);
    } else {
      selectSingleDate(date);
    }
  }

  function handlePointerEnter(date: string) {
    if (!isDragging || !dragAnchorDate) {
      return;
    }

    selectRange(dragAnchorDate, date);
  }

  function stopDragging() {
    setIsDragging(false);
    setDragAnchorDate(null);
  }

  async function saveSelectedDays({
    status,
    title,
  }: {
    status: BusinessCalendarExceptionStatus;
    title: string;
  }) {
    if (selectedDates.length === 0) {
      setErrorMessage("Sélectionne au moins une date dans le calendrier.");
      return;
    }

    setIsSaving(true);
    clearMessages();

    try {
      const response = await fetch("/api/admin/calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceDates: selectedDates,
          status,
          title,
          note,
          opensAt: null,
          closesAt: null,
        }),
      });

      const data = await readJsonResponse<ApiResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || "Impossible d'enregistrer ces dates.");
      }

      setMessage(`${selectedDates.length} date(s) mise(s) à jour.`);
      startTransition(() => router.refresh());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible d'enregistrer ces dates.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveNormalWeek() {
    if (!defaultLocationId) {
      setErrorMessage("Aucun lieu par défaut n'est disponible. Crée d'abord un lieu dans les réglages business.");
      return;
    }

    for (const row of normalWeekRows) {
      if (row.isOpen && (!row.opensAt || !row.closesAt)) {
        setErrorMessage("Chaque jour ouvert doit avoir une heure d'ouverture et une heure de fermeture.");
        setMessage("");
        return;
      }

      if (row.isOpen && row.opensAt >= row.closesAt) {
        setErrorMessage("L'heure d'ouverture doit être avant l'heure de fermeture pour chaque jour ouvert.");
        setMessage("");
        return;
      }
    }

    setIsSavingNormalWeek(true);
    clearMessages();

    try {
      const response = await fetch("/api/admin/business/hours", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationId: defaultLocationId,
          hours: normalWeekRows,
        }),
      });

      const data = await readJsonResponse<HoursResponse>(response);

      if (!response.ok || !data.hours) {
        throw new Error(data.error || "Impossible d'enregistrer la semaine normale.");
      }

      setNormalWeekRows(buildWeekRows(data.hours));
      setMessage("Semaine normale enregistrée. Le calendrier et les réglages business utilisent ces nouveaux jours d'ouverture.");
      startTransition(() => router.refresh());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible d'enregistrer la semaine normale.");
    } finally {
      setIsSavingNormalWeek(false);
    }
  }

  async function clearSelectedDays() {
    if (selectedDates.length === 0) {
      setErrorMessage("Sélectionne au moins une date dans le calendrier.");
      return;
    }

    setIsSaving(true);
    clearMessages();

    try {
      const response = await fetch(`/api/admin/calendar?dates=${encodeURIComponent(selectedDates.join(","))}`, {
        method: "DELETE",
      });
      const data = await readJsonResponse<ApiResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || "Impossible de retirer le marquage.");
      }

      setMessage("Marquage retiré. Les dates reprennent la semaine type.");
      startTransition(() => router.refresh());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de retirer le marquage.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="calendar-admin-layout">
      <section className="card calendar-admin-card">
        <div className="calendar-admin-header">
          <Link href={`/business/calendrier?mois=${previousMonth}`} className="link-button secondary-link">
            Mois précédent
          </Link>
          <div>
            <h2>{monthLabel}</h2>
            <p className="small">
              Clique sur un jour, ou clique-glisse pour sélectionner plusieurs dates.
            </p>
          </div>
          <Link href={`/business/calendrier?mois=${nextMonth}`} className="link-button secondary-link">
            Mois suivant
          </Link>
        </div>

        <div className="calendar-admin-weekdays" aria-hidden="true">
          {WEEKDAY_HEADINGS.map((day) => (
            <strong key={day}>{day}</strong>
          ))}
        </div>

        <div className="calendar-admin-grid" onPointerUp={stopDragging} onPointerLeave={stopDragging}>
          {days.map((day) => {
            const isSelected = selectedDateSet.has(day.date);
            const hasException = day.exception !== null;
            const hasEvents = day.events.length > 0;
            const isHannahLeave = day.exception?.status === "note";
            const isClosedException = day.exception?.status === "closed";
            const isOpenException = day.exception?.status === "open";

            return (
              <button
                key={day.date}
                type="button"
                className={[
                  "calendar-admin-day",
                  !day.isCurrentMonth ? "calendar-admin-day-muted" : "",
                  isSelected ? "calendar-admin-day-selected" : "",
                  day.baseIsOpen ? "calendar-admin-day-base-open" : "calendar-admin-day-base-closed",
                  hasException ? "calendar-admin-day-exception" : "",
                  isHannahLeave ? "calendar-admin-day-hannah" : "",
                  isClosedException ? "calendar-admin-day-force-closed" : "",
                  isOpenException ? "calendar-admin-day-force-open" : "",
                  hasEvents ? "calendar-admin-day-event" : "",
                ].join(" ")}
                onPointerDown={(event) => handlePointerDown(day.date, event)}
                onPointerEnter={() => handlePointerEnter(day.date)}
              >
                <span className="calendar-admin-day-number">{day.dayNumber}</span>
                <span className="calendar-admin-day-status">{getDayStatusLabel(day)}</span>
                {day.events.map((event) => (
                  <span key={event.id} className="calendar-admin-event-tag">
                    {event.title}
                  </span>
                ))}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card calendar-admin-form-card">
        <h2>Actions sur la sélection</h2>
        <p className="calendar-admin-selection-label">{getSelectionLabel(selectedDays)}</p>

        <div className="calendar-action-stack">
          <button
            type="button"
            className="secondary calendar-action-blue"
            disabled={isSaving || isPending || selectedDates.length === 0}
            onClick={() => saveSelectedDays({ status: "note", title: "Congé Hannah" })}
          >
            Congé Hannah
          </button>

          <button
            type="button"
            className="danger"
            disabled={isSaving || isPending || selectedDates.length === 0}
            onClick={() => saveSelectedDays({ status: "closed", title: "Fermeture" })}
          >
            Fermeture
          </button>

          <div className="field">
            <label htmlFor="calendar-note">Note interne optionnelle</label>
            <textarea
              id="calendar-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ex. météo, organisation, remplacement..."
            />
          </div>

          {eventCreationDate ? (
            <Link href={`/business/evenements?date=${eventCreationDate}`} className="link-button primary-link">
              Créer un événement à cette date
            </Link>
          ) : (
            <button type="button" className="secondary" disabled>
              Sélectionne une seule date pour créer un événement
            </button>
          )}

          <button
            type="button"
            className="secondary"
            disabled={isSaving || isPending || selectedDates.length === 0}
            onClick={clearSelectedDays}
          >
            Retirer le marquage
          </button>
        </div>

        <div className="calendar-normal-week-box">
          <div className="calendar-normal-week-header">
            <div>
              <strong>Jours et horaires normaux</strong>
              <p className="small">
                {defaultLocationId
                  ? `Réglage partagé avec les réglages business pour : ${defaultLocationName}.`
                  : "Crée d'abord un lieu par défaut dans les réglages business."}
              </p>
            </div>

            <button
              type="button"
              className="primary"
              disabled={!defaultLocationId || isSavingNormalWeek || isPending}
              onClick={saveNormalWeek}
            >
              {isSavingNormalWeek ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>

          <div className="calendar-normal-week-list">
            {normalWeekRows.map((row) => {
              const weekdayLabel = WEEKDAYS.find((day) => day.value === row.isoWeekday)?.label ?? "Jour";

              return (
                <div key={row.isoWeekday} className="calendar-normal-week-row">
                  <label className="checkbox-row calendar-normal-week-day">
                    <input
                      type="checkbox"
                      checked={row.isOpen}
                      onChange={(event) =>
                        setNormalWeekRows((previous) =>
                          previous.map((entry) =>
                            entry.isoWeekday === row.isoWeekday
                              ? { ...entry, isOpen: event.target.checked }
                              : entry,
                          ),
                        )
                      }
                    />
                    <span>{weekdayLabel}</span>
                  </label>

                  <div className="calendar-normal-week-times">
                    <input
                      type="time"
                      aria-label={`Ouverture ${weekdayLabel}`}
                      value={row.opensAt}
                      disabled={!row.isOpen}
                      onChange={(event) =>
                        setNormalWeekRows((previous) =>
                          previous.map((entry) =>
                            entry.isoWeekday === row.isoWeekday
                              ? { ...entry, opensAt: event.target.value }
                              : entry,
                          ),
                        )
                      }
                    />
                    <span>→</span>
                    <input
                      type="time"
                      aria-label={`Fermeture ${weekdayLabel}`}
                      value={row.closesAt}
                      disabled={!row.isOpen}
                      onChange={(event) =>
                        setNormalWeekRows((previous) =>
                          previous.map((entry) =>
                            entry.isoWeekday === row.isoWeekday
                              ? { ...entry, closesAt: event.target.value }
                              : entry,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="calendar-admin-legend">
          <span><i className="legend-dot legend-dot-open" /> Ouvert d'après la semaine type</span>
          <span><i className="legend-dot legend-dot-closed" /> Fermé d'après la semaine type</span>
          <span><i className="legend-dot legend-dot-blue" /> Congé Hannah</span>
          <span><i className="legend-dot legend-dot-black" /> Fermeture</span>
          <span><i className="legend-dot legend-dot-event" /> Événement</span>
        </div>

        {errorMessage ? <div className="message error">{errorMessage}</div> : null}
        {message ? <div className="message success">{message}</div> : null}
      </section>
    </div>
  );
}
