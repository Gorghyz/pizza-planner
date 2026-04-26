"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerRequest, CustomerRequestStatus } from "@/lib/types";

type CustomerRequestBoardProps = {
  requests: CustomerRequest[];
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  orderId?: number;
};

const statusLabels: Record<CustomerRequestStatus, string> = {
  new: "Nouvelle",
  contacted: "Contactée",
  resolved: "Traitée",
};

const statusOrder: CustomerRequestStatus[] = ["new", "contacted", "resolved"];

function formatEuros(priceCents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(priceCents / 100);
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error(`Réponse vide du serveur. Statut HTTP : ${response.status}.`);
  }

  return JSON.parse(raw) as T;
}

export default function CustomerRequestBoard({
  requests,
}: CustomerRequestBoardProps) {
  const router = useRouter();
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function changeStatus(
    requestId: number,
    status: CustomerRequestStatus,
  ) {
    setErrorMessage("");
    setSuccessMessage("");
    setBusyRequestId(requestId);

    try {
      const response = await fetch("/api/admin/customer-requests/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status,
        }),
      });

      const data = await readJsonResponse<ApiResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || "Erreur de mise à jour.");
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur de mise à jour.",
      );
    } finally {
      setBusyRequestId(null);
    }
  }

  async function convertToOrder(requestId: number) {
    setErrorMessage("");
    setSuccessMessage("");
    setBusyRequestId(requestId);

    try {
      const response = await fetch("/api/admin/customer-requests/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
        }),
      });

      const data = await readJsonResponse<ApiResponse>(response);

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible de convertir la demande en commande.",
        );
      }

      setSuccessMessage(
        `Demande convertie en commande #${data.orderId ?? "?"}.`,
      );
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de convertir la demande.",
      );
    } finally {
      setBusyRequestId(null);
    }
  }

  return (
    <div className="form-stack">
      {errorMessage ? <div className="message error">{errorMessage}</div> : null}
      {successMessage ? (
        <div className="message success">{successMessage}</div>
      ) : null}

      {requests.length === 0 ? (
        <div className="card">
          <p className="empty">Aucune demande client enregistrée.</p>
        </div>
      ) : (
        <div className="request-grid">
          {requests.map((request) => (
            <article key={request.id} className="request-card">
              <div className="request-card-top">
                <div>
                  <div className="request-slot">{request.selectedSlot}</div>
                  <div className="small">
                    Demandée à {request.desiredTime} · Créée le {request.createdAt}
                  </div>
                </div>

                <span
                  className={`status-pill status-${request.status.replace("_", "-")}`}
                >
                  {statusLabels[request.status]}
                </span>
              </div>

              <h2 className="request-customer">{request.customerName}</h2>

              <div className="request-phone">
                Téléphone :{" "}
                <a href={`tel:${request.customerPhone}`}>{request.customerPhone}</a>
              </div>

              <div className="request-meta">
                {request.totalPizzas} pizza(s) · {formatEuros(request.totalPriceCents)} ·{" "}
                {request.totalMinutes} min
              </div>

              <div className="request-section">
                <strong>Commande</strong>
                <div className="multiline-text">{request.itemSummary}</div>
              </div>

              {request.notes ? (
                <div className="request-section">
                  <strong>Commentaire</strong>
                  <div className="multiline-text">{request.notes}</div>
                </div>
              ) : null}

              <div className="request-actions">
                <a href={`tel:${request.customerPhone}`} className="link-button secondary-link">
                  Appeler
                </a>
                <a href={`sms:${request.customerPhone}`} className="link-button">
                  SMS
                </a>
                <button
                  type="button"
                  className="primary"
                  disabled={busyRequestId === request.id || request.status === "resolved"}
                  onClick={() => convertToOrder(request.id)}
                >
                  Convertir en commande
                </button>
              </div>

              <div className="request-status-row">
                {statusOrder.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={status === request.status ? "primary" : "secondary"}
                    disabled={busyRequestId === request.id}
                    onClick={() => changeStatus(request.id, status)}
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