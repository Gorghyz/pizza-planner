"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_TIME_ZONE } from "@/lib/config";
import type { OrderStatus, TodayOrder } from "@/lib/types";

type KitchenBoardProps = {
  orders: TodayOrder[];
  serviceDateLabel: string;
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
};

const statusLabels: Record<OrderStatus, string> = {
  new: "À faire",
  in_progress: "En cours",
  ready: "Prête",
  completed: "Remise",
};

const orderedStatuses: OrderStatus[] = [
  "new",
  "in_progress",
  "ready",
  "completed",
];

type EditDraft = {
  promisedTime: string;
  notes: string;
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function getOverlappingOrderIds(orders: TodayOrder[]): Set<number> {
  const overlappingOrderIds = new Set<number>();

  for (let i = 0; i < orders.length; i += 1) {
    const first = orders[i];
    const firstEnd = timeToMinutes(first.promisedTime);
    const firstStart = firstEnd - first.totalMinutes;

    for (let j = i + 1; j < orders.length; j += 1) {
      const second = orders[j];
      const secondEnd = timeToMinutes(second.promisedTime);
      const secondStart = secondEnd - second.totalMinutes;

      if (rangesOverlap(firstStart, firstEnd, secondStart, secondEnd)) {
        overlappingOrderIds.add(first.id);
        overlappingOrderIds.add(second.id);
      }
    }
  }

  return overlappingOrderIds;
}

function getPrepStartTime(order: TodayOrder): string {
  const promised = timeToMinutes(order.promisedTime);
  const start = promised - order.totalMinutes;
  const h = Math.floor(start / 60)
    .toString()
    .padStart(2, "0");
  const m = (start % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function getUrgencyClass(order: TodayOrder, now: Date): string {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const promisedMinutes = timeToMinutes(order.promisedTime);
  const prepStartMinutes = promisedMinutes - order.totalMinutes;

  if (currentMinutes < prepStartMinutes) {
    return "urgency-green";
  }

  if (currentMinutes <= promisedMinutes) {
    return "urgency-yellow";
  }

  return "urgency-red";
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error(`Réponse vide du serveur. Statut HTTP : ${response.status}.`);
  }

  return JSON.parse(raw) as T;
}

export default function KitchenBoard({ orders, serviceDateLabel }: KitchenBoardProps) {
  const router = useRouter();
  const [now, setNow] = useState(new Date());
  const [errorMessage, setErrorMessage] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({
    promisedTime: "",
    notes: "",
  });

  const overlappingOrderIds = useMemo(() => getOverlappingOrderIds(orders), [orders]);

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setNow(new Date());
    }, 30000);

    const refreshTimer = setInterval(() => {
      router.refresh();
    }, 10000);

    return () => {
      clearInterval(clockTimer);
      clearInterval(refreshTimer);
    };
  }, [router]);

  function startEditing(order: TodayOrder) {
    setErrorMessage("");
    setEditingOrderId(order.id);
    setEditDraft({
      promisedTime: order.promisedTime,
      notes: order.notes ?? "",
    });
  }

  async function changeStatus(orderId: number, status: OrderStatus) {
    setErrorMessage("");
    setBusyOrderId(orderId);

    try {
      const response = await fetch("/api/admin/orders/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          status,
        }),
      });

      const data = await readJsonResponse<ApiResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || "Erreur de mise à jour du statut.");
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur de mise à jour du statut.",
      );
    } finally {
      setBusyOrderId(null);
    }
  }

  async function saveOrderDetails(orderId: number) {
    setErrorMessage("");
    setBusyOrderId(orderId);

    try {
      const response = await fetch("/api/admin/orders/details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          promisedTime: editDraft.promisedTime,
          notes: editDraft.notes,
        }),
      });

      const data = await readJsonResponse<ApiResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || "Erreur de modification de la commande.");
      }

      setEditingOrderId(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur de modification de la commande.",
      );
    } finally {
      setBusyOrderId(null);
    }
  }

  return (
    <div className="form-stack">
      <div className="kitchen-toolbar">
        <div className="small">
          Heure actuelle :{" "}
          {now.toLocaleTimeString("fr-FR", {
            timeZone: APP_TIME_ZONE,
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        <button
          type="button"
          className="secondary"
          onClick={() => router.refresh()}
        >
          Rafraîchir
        </button>
      </div>

      {errorMessage ? <div className="message error">{errorMessage}</div> : null}

      {orders.length === 0 ? (
        <div className="card">
          <p className="empty">Aucune commande enregistrée pour cette date.</p>
        </div>
      ) : (
        <div className="kitchen-grid">
          {orders.map((order) => {
            const isOverlapping = overlappingOrderIds.has(order.id);
            const isEditing = editingOrderId === order.id;

            return (
              <article
                key={order.id}
                className={`kitchen-card ${isOverlapping ? "urgency-purple" : getUrgencyClass(order, now)}`}
              >
                <div className="kitchen-card-top">
                  <div>
                    <div className="kitchen-time">{order.promisedTime}</div>
                    <div className="small">
                      {serviceDateLabel}
                      {order.eventTitle ? ` · ${order.eventTitle}` : ""}
                      {" · "}
                      Début théorique : {getPrepStartTime(order)}
                      {" · "}
                      Charge : {order.totalMinutes} min
                    </div>
                    {isOverlapping ? (
                      <div className="small kitchen-overlap-warning">
                        Chevauchement avec une autre commande.
                      </div>
                    ) : null}
                  </div>

                  <span className={`status-pill status-${order.status.replace("_", "-")}`}>
                    {statusLabels[order.status]}
                  </span>
                </div>

                <h2 className="kitchen-customer">{order.customerName}</h2>

                <div className="kitchen-section">
                  <strong>Commande</strong>
                  <div className="multiline-text">{order.itemSummary}</div>
                </div>

                {order.notes ? (
                  <div className="kitchen-section">
                    <strong>Note</strong>
                    <div className="multiline-text">{order.notes}</div>
                  </div>
                ) : null}

                {isEditing ? (
                  <div className="kitchen-edit-panel">
                    <div className="field">
                      <label htmlFor={`promised-time-${order.id}`}>Nouvelle heure</label>
                      <input
                        id={`promised-time-${order.id}`}
                        type="time"
                        value={editDraft.promisedTime}
                        onChange={(event) =>
                          setEditDraft((current) => ({
                            ...current,
                            promisedTime: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="field">
                      <label htmlFor={`notes-${order.id}`}>Note cuisine</label>
                      <textarea
                        id={`notes-${order.id}`}
                        rows={3}
                        value={editDraft.notes}
                        onChange={(event) =>
                          setEditDraft((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="Commentaire interne, précision client, changement de créneau..."
                      />
                    </div>

                    <div className="kitchen-actions">
                      <button
                        type="button"
                        className="primary"
                        disabled={busyOrderId === order.id || !editDraft.promisedTime}
                        onClick={() => saveOrderDetails(order.id)}
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={busyOrderId === order.id}
                        onClick={() => setEditingOrderId(null)}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="kitchen-actions">
                    <button
                      type="button"
                      className="secondary"
                      disabled={busyOrderId === order.id}
                      onClick={() => startEditing(order)}
                    >
                      Modifier heure / note
                    </button>
                  </div>
                )}

                <div className="kitchen-actions">
                  {orderedStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={status === order.status ? "primary" : "secondary"}
                      disabled={busyOrderId === order.id}
                      onClick={() => changeStatus(order.id, status)}
                    >
                      {statusLabels[status]}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
