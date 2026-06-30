"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DraftItem, Pizza, QuoteResponse } from "@/lib/types";

type OrderScreenProps = {
  pizzas: Pizza[];
  serviceDate: string;
  serviceOpeningTime: string;
  serviceLabel: string;
};

type ApiErrorResponse = {
  error?: string;
};

type SaveOrderResponse = {
  ok?: boolean;
  orderId?: number;
  error?: string;
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  try {
    return JSON.parse(raw) as T;
  } catch {
    if (
      raw.startsWith("<!DOCTYPE") ||
      raw.startsWith("<html") ||
      raw.startsWith("<!doctype")
    ) {
      throw new Error(
        "Le serveur a renvoyé une page d'erreur HTML au lieu d'une réponse JSON. Regarde la fenêtre PowerShell où tourne npm run dev pour voir l'erreur exacte."
      );
    }

    throw new Error(`Réponse invalide du serveur : ${raw.slice(0, 200)}`);
  }
}

export default function OrderScreen({
  pizzas,
  serviceDate,
  serviceOpeningTime,
  serviceLabel,
}: OrderScreenProps) {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [desiredTime, setDesiredTime] = useState(serviceOpeningTime);
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [lineComments, setLineComments] = useState<Record<number, string>>({});
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const items = useMemo<DraftItem[]>(() => {
    return pizzas
      .map((pizza) => {
        const quantity = quantities[pizza.id] ?? 0;

        return {
          pizzaId: pizza.id,
          quantity,
          comment: (lineComments[pizza.id] ?? "").trim(),
        };
      })
      .filter((item) => item.quantity > 0);
  }, [lineComments, pizzas, quantities]);

  const totalPizzas = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function clearQuote() {
    setQuote(null);
    setSelectedSlot("");
  }

  function handleQuantityChange(pizzaId: number, rawValue: string) {
    const value = Number(rawValue);

    setQuantities((previous) => ({
      ...previous,
      [pizzaId]: Number.isFinite(value) && value > 0 ? Math.floor(value) : 0,
    }));

    clearMessages();
    clearQuote();
  }

  function handleCommentChange(pizzaId: number, value: string) {
    setLineComments((previous) => ({
      ...previous,
      [pizzaId]: value,
    }));

    clearMessages();
    clearQuote();
  }

  async function handleQuote() {
    clearMessages();
    clearQuote();

    if (items.length === 0) {
      setErrorMessage("Ajoute au moins une pizza.");
      return;
    }

    setIsQuoting(true);

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          desiredTime,
          serviceDate,
          items,
        }),
      });

      const data = await readJsonResponse<QuoteResponse & ApiErrorResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || "Erreur de calcul des créneaux.");
      }

      setQuote(data);

      if (data.slots.length > 0) {
        setSelectedSlot(data.slots[0]);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur de calcul des créneaux."
      );
    } finally {
      setIsQuoting(false);
    }
  }

  async function handleSave() {
    clearMessages();

    if (!customerName.trim()) {
      setErrorMessage("Le nom ou prénom est obligatoire.");
      return;
    }

    if (items.length === 0) {
      setErrorMessage("Ajoute au moins une pizza.");
      return;
    }

    if (!selectedSlot) {
      setErrorMessage("Choisis un créneau.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          desiredTime,
          promisedTime: selectedSlot,
          serviceDate,
          notes,
          items,
        }),
      });

      const data = await readJsonResponse<SaveOrderResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || "Erreur d'enregistrement.");
      }

      setCustomerName("");
      setDesiredTime(serviceOpeningTime);
      setNotes("");
      setQuantities({});
      setLineComments({});
      clearQuote();
      setSuccessMessage(`Commande enregistrée pour ${serviceLabel}.`);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur d'enregistrement."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="form-stack">
      <div className="info-box">
        <strong>Service sélectionné</strong>
        <div>{serviceLabel}</div>
        <div className="small">
          Les commandes saisies ici seront enregistrées pour cette date.
        </div>
      </div>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="customerName">Nom ou prénom</label>
          <input
            id="customerName"
            type="text"
            value={customerName}
            onChange={(event) => {
              setCustomerName(event.target.value);
              clearMessages();
            }}
            placeholder="Ex. Martin"
          />
        </div>

        <div className="field">
          <label htmlFor="desiredTime">Heure souhaitée</label>
          <input
            id="desiredTime"
            type="time"
            value={desiredTime}
            onChange={(event) => {
              setDesiredTime(event.target.value);
              clearMessages();
              clearQuote();
            }}
          />
        </div>
      </div>

      <div className="field">
        <label>Pizzas</label>
        <div className="pizza-list">
          {pizzas.map((pizza) => (
            <div key={pizza.id} className="pizza-row">
              <div>
                <div className="pizza-title">{pizza.name}</div>
                <div className="pizza-meta">
                  Temps standard : {pizza.prepMinutes} min
                </div>
              </div>

              <div className="field">
                <label htmlFor={`qty-${pizza.id}`}>Quantité</label>
                <input
                  id={`qty-${pizza.id}`}
                  type="number"
                  min="0"
                  step="1"
                  value={quantities[pizza.id] ?? 0}
                  onChange={(event) => handleQuantityChange(pizza.id, event.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor={`comment-${pizza.id}`}>Commentaire ligne</label>
                <input
                  id={`comment-${pizza.id}`}
                  type="text"
                  value={lineComments[pizza.id] ?? ""}
                  onChange={(event) => handleCommentChange(pizza.id, event.target.value)}
                  placeholder="Ex. sans oignons"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Commentaire global</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            clearMessages();
          }}
          placeholder="Informations générales sur la commande"
        />
      </div>

      <div className="info-box">
        <strong>Résumé</strong>
        <div>{totalPizzas} pizza(s) sélectionnée(s)</div>
        <div className="small">
          Les créneaux seront calculés selon les temps de préparation enregistrés
          dans la base.
        </div>
      </div>

      <div className="actions">
        <button
          type="button"
          className="secondary"
          onClick={handleQuote}
          disabled={isQuoting || isSaving}
        >
          {isQuoting ? "Calcul..." : "Proposer les créneaux"}
        </button>

        <button
          type="button"
          className="primary"
          onClick={handleSave}
          disabled={!quote || !selectedSlot || isSaving}
        >
          {isSaving ? "Enregistrement..." : "Enregistrer la commande"}
        </button>
      </div>

      {errorMessage ? <div className="message error">{errorMessage}</div> : null}
      {successMessage ? <div className="message success">{successMessage}</div> : null}

      {quote ? (
        <div className="info-box">
          <strong>Créneaux proposés</strong>
          <div className="small">Charge calculée : {quote.totalMinutes} min</div>

          {quote.slots.length === 0 ? (
            <p className="empty">Aucun créneau disponible pour cette date avec cette charge.</p>
          ) : (
            <div className="slot-list" style={{ marginTop: 12 }}>
              {quote.slots.map((slot) => (
                <label key={slot} className="slot-option">
                  <input
                    type="radio"
                    name="slot"
                    value={slot}
                    checked={selectedSlot === slot}
                    onChange={() => setSelectedSlot(slot)}
                  />
                  <span>{slot}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
