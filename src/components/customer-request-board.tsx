"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerRequest, CustomerRequestStatus } from "@/lib/types";

type CustomerRequestBoardProps = {
  requests: CustomerRequest[];
  todayDate: string;
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  orderId?: number;
};

type SlotsApiResponse = ApiResponse & {
  slots?: string[];
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
  todayDate,
}: CustomerRequestBoardProps) {
  const router = useRouter();
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);
  const [openSlotEditorId, setOpenSlotEditorId] = useState<number | null>(null);
  const [slotOptions, setSlotOptions] = useState<Record<number, string[]>>({});
  const [slotLoadingId, setSlotLoadingId] = useState<number | null>(null);
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

  async function loadSlotOptions(request: CustomerRequest) {
    setErrorMessage("");
    setSuccessMessage("");
    setSlotLoadingId(request.id);

    try {
      const response = await fetch("/api/admin/customer-requests/slots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: request.id,
        }),
      });

      const data = await readJsonResponse<SlotsApiResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || "Impossible de charger les créneaux disponibles.");
      }

      setSlotOptions((current) => ({
        ...current,
        [request.id]: data.slots ?? [],
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les créneaux disponibles.",
      );
    } finally {
      setSlotLoadingId(null);
    }
  }

  async function toggleSlotEditor(request: CustomerRequest) {
    if (openSlotEditorId === request.id) {
      setOpenSlotEditorId(null);
      return;
    }

    setOpenSlotEditorId(request.id);

    if (!slotOptions[request.id]) {
      await loadSlotOptions(request);
    }
  }

  async function updateSlot(requestId: number, selectedSlot: string) {
    setErrorMessage("");
    setSuccessMessage("");
    setBusyRequestId(requestId);

    try {
      const response = await fetch("/api/admin/customer-requests/slot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          selectedSlot,
        }),
      });

      const data = await readJsonResponse<ApiResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || "Impossible de modifier le créneau.");
      }

      setSuccessMessage(`Créneau modifié : ${selectedSlot}.`);
      setOpenSlotEditorId(null);
      setSlotOptions((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le créneau.",
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

  const todaysRequests = requests.filter(
    (request) =>
      request.eventId === null &&
      request.serviceDate === todayDate &&
      request.createdDate === todayDate,
  );
  const eventPreorderRequests = requests.filter(
    (request) =>
      request.eventId !== null &&
      request.status !== "resolved" &&
      request.serviceDate >= todayDate,
  );

  function renderSlotEditor(request: CustomerRequest) {
    if (request.status === "resolved") {
      return null;
    }

    const isOpen = openSlotEditorId === request.id;
    const options = slotOptions[request.id] ?? [];
    const isLoading = slotLoadingId === request.id;

    return (
      <div className="request-slot-edit">
        <button
          type="button"
          className="secondary"
          disabled={busyRequestId === request.id}
          onClick={() => toggleSlotEditor(request)}
        >
          {isOpen ? "Masquer les créneaux" : "Modifier créneau"}
        </button>

        {isOpen ? (
          <div className="request-slot-options" aria-live="polite">
            <p className="small">
              Créneaux disponibles autour de {request.selectedSlot}, en tenant compte
              des commandes déjà validées.
            </p>

            {isLoading ? (
              <p className="empty compact">Chargement des créneaux…</p>
            ) : options.length === 0 ? (
              <p className="empty compact">
                Aucun autre créneau disponible autour de cette demande.
              </p>
            ) : (
              <div className="request-slot-option-row">
                {options.map((slot) => {
                  const isCurrentSlot = slot === request.selectedSlot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      className={isCurrentSlot ? "primary" : "secondary"}
                      disabled={busyRequestId === request.id || isCurrentSlot}
                      onClick={() => updateSlot(request.id, slot)}
                    >
                      {slot}
                      {isCurrentSlot ? " · actuel" : ""}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  function renderRequestCard(request: CustomerRequest) {
    return (
      <article key={request.id} className="request-card">
        <div className="request-card-top">
          <div>
            <div className="request-slot">{request.selectedSlot}</div>
            <div className="small">
              {request.serviceDateLabel}
              {request.eventTitle ? ` · ${request.eventTitle}` : ""}
              <br />
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
          Téléphone : <a href={`tel:${request.customerPhone}`}>{request.customerPhone}</a>
        </div>

        <div className="request-meta">
          {request.totalPizzas} pizza(s) · {formatEuros(request.totalPriceCents)} ·{" "}
          {request.totalMinutes} min
        </div>

        {request.eventTitle ? (
          <div className="request-section">
            <strong>Événement</strong>
            <div className="multiline-text">{request.eventTitle}</div>
          </div>
        ) : null}

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

        {renderSlotEditor(request)}

        <div className="request-actions">
          <a href={`tel:${request.customerPhone}`} className="link-button secondary-link">
            Appeler
          </a>
          <a href={`sms:${request.customerPhone}`} className="link-button">
            SMS
          </a>
          {request.eventId ? (
            <a
              href={`/business/cuisine?date=${request.serviceDate}`}
              className="link-button secondary-link"
            >
              Cuisine du service
            </a>
          ) : null}
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
    );
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
        <>
          <section className="card">
            <h2>Demandes du jour</h2>
            <p className="small">
              Les demandes classiques restent limitées à la journée en cours.
              Les essais et demandes des jours précédents restent en base, mais
              ne sont plus affichés ici.
            </p>

            {todaysRequests.length === 0 ? (
              <p className="empty">Aucune demande classique pour aujourd’hui.</p>
            ) : (
              <div className="request-grid">
                {todaysRequests.map((request) => renderRequestCard(request))}
              </div>
            )}
          </section>

          <section className="card">
            <h2>Précommandes événements</h2>
            <p className="small">
              Les précommandes web des événements restent visibles jusqu’à leur
              conversion en commande. Une fois converties, elles disparaissent
              d’ici et apparaissent dans la vue cuisine à la date du service.
              Les SMS reçus directement restent à traiter dans ta messagerie.
            </p>

            {eventPreorderRequests.length === 0 ? (
              <p className="empty">Aucune précommande événement à traiter.</p>
            ) : (
              <div className="request-grid">
                {eventPreorderRequests.map((request) => renderRequestCard(request))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
