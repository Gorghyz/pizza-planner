"use client";

import { useEffect, useMemo, useState } from "react";
import type { DraftItem, Pizza, QuoteResponse } from "@/lib/types";

type PublicCarteBuilderProps = {
  pizzas: Pizza[];
};

type DeviceMode = "unknown" | "mobile" | "desktop";

type ApiErrorResponse = {
  error?: string;
};

type SaveRequestResponse = {
  ok?: boolean;
  error?: string;
};

const ORDER_PHONE_NUMBER = "0679958962";

function formatEuros(priceCents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(priceCents / 100);
}

function normalizePhoneForSmsLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    return `+33${digits.slice(1)}`;
  }

  if (digits.startsWith("33")) {
    return `+${digits}`;
  }

  if (phone.startsWith("+")) {
    return phone;
  }

  return digits;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error(`Réponse vide du serveur. Statut HTTP : ${response.status}.`);
  }

  return JSON.parse(raw) as T;
}

export default function PublicCarteBuilder({
  pizzas,
}: PublicCarteBuilderProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("unknown");

  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [desiredTime, setDesiredTime] = useState("");
  const [notes, setNotes] = useState("");

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const [isQuoting, setIsQuoting] = useState(false);
  const [isSendingDesktopRequest, setIsSendingDesktopRequest] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");

    function updateMode() {
      setDeviceMode(mediaQuery.matches ? "mobile" : "desktop");
    }

    updateMode();

    mediaQuery.addEventListener("change", updateMode);

    return () => {
      mediaQuery.removeEventListener("change", updateMode);
    };
  }, []);

  const items = useMemo<DraftItem[]>(() => {
    return pizzas
      .map((pizza) => ({
        pizzaId: pizza.id,
        quantity: quantities[pizza.id] ?? 0,
      }))
      .filter((item) => item.quantity > 0);
  }, [pizzas, quantities]);

  const selectedItems = useMemo(() => {
    return pizzas
      .map((pizza) => ({
        pizza,
        quantity: quantities[pizza.id] ?? 0,
      }))
      .filter((item) => item.quantity > 0);
  }, [pizzas, quantities]);

  const totalPizzas = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedItems]);

  const totalPriceCents = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) => sum + item.quantity * item.pizza.priceCents,
      0,
    );
  }, [selectedItems]);

  const smsBody = useMemo(() => {
    const lines: string[] = [];

    lines.push("Bonjour, je souhaite commander :");

    if (selectedItems.length === 0) {
      lines.push("- aucune pizza sélectionnée pour le moment");
    } else {
      for (const item of selectedItems) {
        lines.push(`- ${item.quantity} x ${item.pizza.name}`);
      }
    }

    lines.push("");
    lines.push(`Nom / prénom : ${customerName.trim() || "à préciser"}`);
    lines.push(`Créneau souhaité : ${selectedSlot || "à préciser"}`);

    if (desiredTime.trim()) {
      lines.push(`Heure souhaitée initiale : ${desiredTime.trim()}`);
    }

    lines.push(`Commentaire : ${notes.trim() || "aucun"}`);
    lines.push("");
    lines.push("Merci.");

    return lines.join("\n");
  }, [customerName, desiredTime, notes, selectedItems, selectedSlot]);

  const smsHref = useMemo(() => {
    const target = normalizePhoneForSmsLink(ORDER_PHONE_NUMBER);
    const encodedBody = encodeURIComponent(smsBody);

    return `sms:${target}?body=${encodedBody}`;
  }, [smsBody]);

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
    setCopyMessage("");
  }

  function clearQuote() {
    setQuote(null);
    setSelectedSlot("");
  }

  function setQuantity(pizzaId: number, nextQuantity: number) {
    setQuantities((previous) => ({
      ...previous,
      [pizzaId]: Math.max(0, nextQuantity),
    }));

    clearMessages();
    clearQuote();
  }

  async function handleQuote() {
    clearMessages();
    clearQuote();

    if (items.length === 0) {
      setErrorMessage("Choisis au moins une pizza.");
      return;
    }

    if (!desiredTime) {
      setErrorMessage("Renseigne une heure souhaitée pour obtenir des créneaux.");
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
          items,
        }),
      });

      const data = await readJsonResponse<QuoteResponse & ApiErrorResponse>(
        response,
      );

      if (!response.ok) {
        throw new Error(data.error || "Erreur de calcul des créneaux.");
      }

      setQuote(data);

      if (data.slots.length > 0) {
        setSelectedSlot(data.slots[0]);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur de calcul des créneaux.",
      );
    } finally {
      setIsQuoting(false);
    }
  }

  async function handleCopyMessage() {
    if (!selectedSlot) {
      setErrorMessage("Choisis d'abord un créneau.");
      return;
    }

    try {
      await navigator.clipboard.writeText(smsBody);
      setCopyMessage("Message copié.");
      window.setTimeout(() => setCopyMessage(""), 2500);
    } catch {
      setCopyMessage("Impossible de copier automatiquement le message.");
      window.setTimeout(() => setCopyMessage(""), 2500);
    }
  }

  function handleOpenSms() {
    clearMessages();

    if (items.length === 0) {
      setErrorMessage("Choisis au moins une pizza.");
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage("Renseigne ton nom ou prénom.");
      return;
    }

    if (!selectedSlot) {
      setErrorMessage("Choisis d'abord un créneau.");
      return;
    }

    window.location.href = smsHref;
  }

  async function handleSendDesktopRequest() {
    clearMessages();

    if (items.length === 0) {
      setErrorMessage("Choisis au moins une pizza.");
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage("Le nom ou prénom est obligatoire.");
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMessage("Le téléphone est obligatoire depuis un ordinateur.");
      return;
    }

    if (!desiredTime) {
      setErrorMessage("Renseigne une heure souhaitée.");
      return;
    }

    if (!selectedSlot) {
      setErrorMessage("Choisis d'abord un créneau disponible.");
      return;
    }

    setIsSendingDesktopRequest(true);

    try {
      const response = await fetch("/api/public/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          desiredTime,
          selectedSlot,
          notes,
          items,
        }),
      });

      const data = await readJsonResponse<SaveRequestResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || "Impossible d'envoyer la demande.");
      }

      setCustomerName("");
      setCustomerPhone("");
      setDesiredTime("");
      setNotes("");
      setQuantities({});
      clearQuote();
      setSuccessMessage(
        "Votre demande a été enregistrée. Nous reviendrons vers vous pour confirmer le créneau.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer la demande.",
      );
    } finally {
      setIsSendingDesktopRequest(false);
    }
  }

  return (
    <div className="form-stack">
      <section className="card public-instructions-card">
        <h2>Comment utiliser cette page</h2>
        <ol className="helper-list">
          <li>Parcours la carte et ajuste les quantités avec les boutons + et -.</li>
          <li>Renseigne ton nom ou prénom et ton heure souhaitée.</li>
          <li>Clique sur <strong>Voir les créneaux disponibles</strong>.</li>
          <li>Choisis un créneau parmi ceux proposés.</li>
          <li>
            Sur smartphone, prépare ton SMS. Sur ordinateur, envoie ta demande
            pour qu&apos;elle soit traitée manuellement.
          </li>
        </ol>

        <p className="small" style={{ marginTop: 10 }}>
          La commande n&apos;est confirmée qu&apos;après validation manuelle de
          notre part.
        </p>
      </section>

      {pizzas.length === 0 ? (
        <section className="card">
          <p className="empty">Aucune pizza active pour le moment.</p>
        </section>
      ) : (
        <div className="public-card-grid">
          {pizzas.map((pizza) => {
            const quantity = quantities[pizza.id] ?? 0;

            return (
              <article key={pizza.id} className="card public-pizza-card">
                {pizza.photoPath ? (
                  <img
                    src={pizza.photoPath}
                    alt={pizza.name}
                    className="public-pizza-photo"
                  />
                ) : null}

                <div className="public-pizza-header">
                  <h2>{pizza.name}</h2>
                  <div className="public-price">
                    {formatEuros(pizza.priceCents)}
                  </div>
                </div>

                {pizza.description ? (
                  <p className="multiline-text">{pizza.description}</p>
                ) : null}

                <div className="catalog-section">
                  <strong>Ingrédients</strong>
                  <div className="multiline-text">
                    {pizza.ingredients || "—"}
                  </div>
                </div>

                <div className="catalog-section">
                  <strong>Allergènes</strong>
                  <div className="multiline-text">
                    {pizza.allergens || "—"}
                  </div>
                </div>

                <div className="public-counter-row">
                  <button
                    type="button"
                    className="secondary counter-button"
                    onClick={() => setQuantity(pizza.id, quantity - 1)}
                  >
                    -
                  </button>

                  <div className="counter-value">{quantity}</div>

                  <button
                    type="button"
                    className="primary counter-button"
                    onClick={() => setQuantity(pizza.id, quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="card public-order-draft-card">
        <h2>Préparer ma demande</h2>

        <div className="field-grid field-grid-2">
          <div className="field">
            <label htmlFor="customerName">Nom / prénom</label>
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

        {deviceMode === "desktop" ? (
          <div className="field">
            <label htmlFor="customerPhone">
              Téléphone (obligatoire depuis un ordinateur)
            </label>
            <input
              id="customerPhone"
              type="tel"
              value={customerPhone}
              onChange={(event) => {
                setCustomerPhone(event.target.value);
                clearMessages();
              }}
              placeholder="Ex. 06 12 34 56 78"
            />
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="notes">Commentaire</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              clearMessages();
            }}
            placeholder="Ex. sans oignons, bien cuite, etc."
          />
        </div>

        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={handleQuote}
            disabled={isQuoting || isSendingDesktopRequest}
          >
            {isQuoting ? "Calcul..." : "Voir les créneaux disponibles"}
          </button>
        </div>

        {quote ? (
          <div className="info-box">
            <strong>Créneaux proposés</strong>
            <div className="small">Charge calculée : {quote.totalMinutes} min</div>

            {quote.slots.length === 0 ? (
              <p className="empty">
                Aucun créneau disponible ce soir avec cette charge.
              </p>
            ) : (
              <div className="slot-list" style={{ marginTop: 12 }}>
                {quote.slots.map((slot) => (
                  <label key={slot} className="slot-option">
                    <input
                      type="radio"
                      name="public-slot"
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

        <div className="info-box">
          <strong>Résumé de la sélection</strong>
          {selectedItems.length === 0 ? (
            <div className="empty">Aucune pizza sélectionnée.</div>
          ) : (
            <div className="multiline-text">
              {selectedItems
                .map((item) => `${item.quantity} x ${item.pizza.name}`)
                .join("\n")}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            Total : {totalPizzas} pizza(s) · {formatEuros(totalPriceCents)}
          </div>
          {selectedSlot ? (
            <div style={{ marginTop: 8 }}>Créneau sélectionné : {selectedSlot}</div>
          ) : null}
        </div>

        {deviceMode === "mobile" ? (
          <div className="actions">
            <button
              type="button"
              className="primary"
              onClick={handleOpenSms}
            >
              Ouvrir mon appli SMS
            </button>

            <button
              type="button"
              className="secondary"
              onClick={handleCopyMessage}
            >
              Copier le message
            </button>
          </div>
        ) : deviceMode === "desktop" ? (
          <div className="actions">
            <button
              type="button"
              className="primary"
              onClick={handleSendDesktopRequest}
              disabled={isSendingDesktopRequest}
            >
              {isSendingDesktopRequest
                ? "Envoi..."
                : "Envoyer ma demande"}
            </button>
          </div>
        ) : (
          <div className="small">
            Détection du type d&apos;appareil en cours...
          </div>
        )}

        {errorMessage ? <div className="message error">{errorMessage}</div> : null}
        {successMessage ? (
          <div className="message success">{successMessage}</div>
        ) : null}
        {copyMessage ? <div className="message success">{copyMessage}</div> : null}

        <div className="field">
          <label htmlFor="smsPreview">Message généré</label>
          <textarea id="smsPreview" value={smsBody} readOnly />
        </div>
      </section>
    </div>
  );
}