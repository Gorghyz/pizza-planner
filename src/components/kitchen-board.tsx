"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
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

  return (
    <div className="form-stack">
      <div className="kitchen-toolbar">
        <div className="small">
          Heure actuelle :{" "}
          {now.toLocaleTimeString("fr-FR", {
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
          {orders.map((order) => (
            <article
              key={order.id}
              className={`kitchen-card ${getUrgencyClass(order, now)}`}
            >
              <div className="kitchen-card-top">
                <div>
                  <div className="kitchen-time">{order.promisedTime}</div>
                  <div className="small">
                    {serviceDateLabel}
                    {order.eventTitle ? ` · ${order.eventTitle}` : ""}
                    {" · "}
                    Début théorique :{" "}
                    {new Date(
                      new Date().setHours(0, 0, 0, 0),
                    ) && (() => {
                      const promised = timeToMinutes(order.promisedTime);
                      const start = promised - order.totalMinutes;
                      const h = Math.floor(start / 60)
                        .toString()
                        .padStart(2, "0");
                      const m = (start % 60).toString().padStart(2, "0");
                      return `${h}:${m}`;
                    })()}
                    {" · "}
                    Charge : {order.totalMinutes} min
                  </div>
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
          ))}
        </div>
      )}
    </div>
  );
}