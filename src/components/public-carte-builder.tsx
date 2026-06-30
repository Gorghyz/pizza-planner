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

type PizzaGroup = {
  title: string;
  pizzas: Pizza[];
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

function isValidFrenchPhone(value: string): boolean {
  return value.replace(/\D/g, "").length >= 10;
}

function parseSlotMinutes(slot: string): number {
  const normalized = slot.trim().toLowerCase().replace("h", ":");
  const match = normalized.match(/(\d{1,2})(?::(\d{2}))?/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");

  return hours * 60 + minutes;
}

function sortSlotsChronologically(slots: string[]): string[] {
  return [...slots].sort((left, right) => {
    const diff = parseSlotMinutes(left) - parseSlotMinutes(right);

    if (diff !== 0) {
      return diff;
    }

    return left.localeCompare(right, "fr");
  });
}

function findClosestSlot(slots: string[], desiredTime: string): string {
  const sortedSlots = sortSlotsChronologically(slots);

  if (sortedSlots.length === 0) {
    return "";
  }

  const desiredMinutes = parseSlotMinutes(desiredTime);

  if (desiredMinutes === Number.MAX_SAFE_INTEGER) {
    return sortedSlots[0];
  }

  let closestSlot = sortedSlots[0];
  let closestDistance = Math.abs(parseSlotMinutes(closestSlot) - desiredMinutes);

  for (const slot of sortedSlots) {
    const slotMinutes = parseSlotMinutes(slot);

    if (slotMinutes === desiredMinutes) {
      return slot;
    }

    const distance = Math.abs(slotMinutes - desiredMinutes);

    if (distance < closestDistance) {
      closestSlot = slot;
      closestDistance = distance;
    }
  }

  return closestSlot;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error(`Réponse vide du serveur. Statut HTTP : ${response.status}.`);
  }

  return JSON.parse(raw) as T;
}

function groupPizzas(pizzas: Pizza[]): PizzaGroup[] {
  const seasonPizzas = pizzas.filter((pizza) => {
    const seasonality = pizza.seasonality.toLowerCase();

    return seasonality.includes("saison") || seasonality.includes("season");
  });

  const seasonIds = new Set(seasonPizzas.map((pizza) => pizza.id));
  const classicPizzas = pizzas.filter((pizza) => !seasonIds.has(pizza.id));
  const groups: PizzaGroup[] = [];

  if (classicPizzas.length > 0) {
    groups.push({
      title: "Les classiques",
      pizzas: classicPizzas,
    });
  }

  if (seasonPizzas.length > 0) {
    groups.push({
      title: "Les saisons",
      pizzas: seasonPizzas,
    });
  }

  if (groups.length === 0 && pizzas.length > 0) {
    groups.push({
      title: "Nos pizzas",
      pizzas,
    });
  }

  return groups;
}

export default function PublicCarteBuilder({ pizzas }: PublicCarteBuilderProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("unknown");

  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [phoneFieldError, setPhoneFieldError] = useState("");
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

  const groups = useMemo(() => groupPizzas(pizzas), [pizzas]);

  const items = useMemo<DraftItem[]>(() => {
    return pizzas
      .map((pizza) => ({
        pizzaId: pizza.id,
        quantity: quantities[pizza.id] ?? 0,
      }))
      .filter((item) => item.quantity > 0);
  }, [pizzas, quantities]);

  const quoteRequestKey = useMemo(() => JSON.stringify(items), [items]);

  const selectedItems = useMemo(() => {
    return pizzas
      .map((pizza) => ({
        pizza,
        quantity: quantities[pizza.id] ?? 0,
      }))
      .filter((item) => item.quantity > 0);
  }, [pizzas, quantities]);

  const sortedQuoteSlots = useMemo(() => {
    if (!quote) {
      return [];
    }

    return sortSlotsChronologically(quote.slots);
  }, [quote]);

  const totalPriceCents = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) => sum + item.quantity * item.pizza.priceCents,
      0,
    );
  }, [selectedItems]);

  const smsBody = useMemo(() => {
    const lines: string[] = [];
    const effectiveDesiredTime = desiredTime || selectedSlot;

    lines.push("Bonjour, je souhaite préparer une demande :");

    if (selectedItems.length === 0) {
      lines.push("- aucune pizza sélectionnée pour le moment");
    } else {
      for (const item of selectedItems) {
        lines.push(`- ${item.quantity} x ${item.pizza.name}`);
      }
    }

    lines.push("");
    lines.push(`Nom ou prénom : ${customerName.trim() || "à préciser"}`);
    lines.push(`Téléphone : ${customerPhone.trim() || "à préciser"}`);
    lines.push(`Créneau souhaité : ${selectedSlot || "à préciser"}`);

    if (effectiveDesiredTime.trim() && effectiveDesiredTime !== selectedSlot) {
      lines.push(`Heure souhaitée initiale : ${effectiveDesiredTime.trim()}`);
    }

    lines.push(`Commentaire : ${notes.trim() || "aucun"}`);
    lines.push("");
    lines.push("Merci.");

    return lines.join("\n");
  }, [customerName, customerPhone, desiredTime, notes, selectedItems, selectedSlot]);

  const smsHref = useMemo(() => {
    const target = normalizePhoneForSmsLink(ORDER_PHONE_NUMBER);
    const encodedBody = encodeURIComponent(smsBody);

    return `sms:${target}?body=${encodedBody}`;
  }, [smsBody]);

  useEffect(() => {
    let shouldIgnore = false;

    async function updateQuote() {
      if (items.length === 0) {
        setQuote(null);
        setSelectedSlot("");
        setIsQuoting(false);
        return;
      }

      setIsQuoting(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/quote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            desiredTime: desiredTime || undefined,
            items,
          }),
        });

        const data = await readJsonResponse<QuoteResponse & ApiErrorResponse>(
          response,
        );

        if (!response.ok) {
          throw new Error(data.error || "Erreur de calcul des créneaux.");
        }

        if (shouldIgnore) {
          return;
        }

        const closestReference =
          desiredTime || data.serviceOpeningTime || data.slots[0] || "";

        setQuote(data);
        setSelectedSlot(findClosestSlot(data.slots, closestReference));
      } catch (error) {
        if (shouldIgnore) {
          return;
        }

        setQuote(null);
        setSelectedSlot("");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erreur de calcul des créneaux.",
        );
      } finally {
        if (!shouldIgnore) {
          setIsQuoting(false);
        }
      }
    }

    updateQuote();

    return () => {
      shouldIgnore = true;
    };
  }, [quoteRequestKey, desiredTime]);

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
    setCopyMessage("");
  }

  function setQuantity(pizzaId: number, nextQuantity: number) {
    setQuantities((previous) => ({
      ...previous,
      [pizzaId]: Math.max(0, nextQuantity),
    }));

    clearMessages();
  }

  function validateCustomerPhoneForFinalAction(): boolean {
    if (!customerPhone.trim()) {
      setPhoneFieldError(
        "Renseignez un numéro de téléphone pour que nous puissions confirmer le créneau.",
      );

      return false;
    }

    if (!isValidFrenchPhone(customerPhone)) {
      setPhoneFieldError("Indiquez un numéro de téléphone valide.");

      return false;
    }

    setPhoneFieldError("");

    return true;
  }

  async function handleCopyMessage() {
    if (!selectedSlot) {
      setErrorMessage("Choisis d’abord un créneau.");
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

    if (!validateCustomerPhoneForFinalAction()) {
      return;
    }

    if (isQuoting) {
      setErrorMessage("Les créneaux sont encore en cours de mise à jour.");
      return;
    }

    if (!selectedSlot) {
      setErrorMessage("Choisis d’abord un créneau disponible.");
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

    if (!validateCustomerPhoneForFinalAction()) {
      return;
    }

    if (isQuoting) {
      setErrorMessage("Les créneaux sont encore en cours de mise à jour.");
      return;
    }

    if (!selectedSlot) {
      setErrorMessage("Choisis d’abord un créneau disponible.");
      return;
    }

    setIsSendingDesktopRequest(true);

    try {
      const effectiveDesiredTime = desiredTime || selectedSlot;

      const response = await fetch("/api/public/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          desiredTime: effectiveDesiredTime,
          selectedSlot,
          notes,
          items,
        }),
      });

      const data = await readJsonResponse<SaveRequestResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || "Impossible d’envoyer la demande.");
      }

      setCustomerName("");
      setCustomerPhone("");
      setPhoneFieldError("");
      setDesiredTime("");
      setNotes("");
      setQuantities({});
      setQuote(null);
      setSelectedSlot("");

      setSuccessMessage(
        "Votre demande a été enregistrée. Nous reviendrons vers vous pour confirmer le créneau.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible d’envoyer la demande.",
      );
    } finally {
      setIsSendingDesktopRequest(false);
    }
  }

  return (
    <section className="att-carte-layout">
      <div className="att-pizza-column">
        {pizzas.length === 0 ? (
          <section className="att-ink-card att-empty-menu-card">
            <p>Aucune pizza active pour le moment.</p>
          </section>
        ) : (
          groups.map((group) => (
            <section key={group.title} className="att-pizza-group">
              <h2>{group.title}</h2>

              <div className="att-pizza-card-grid">
                {group.pizzas.map((pizza) => {
                  const quantity = quantities[pizza.id] ?? 0;
                  const description = pizza.description || pizza.ingredients;

                  return (
                    <article key={pizza.id} className="att-pizza-card">
                      {pizza.photoPath ? (
                        <img
                          src={pizza.photoPath}
                          alt={pizza.name}
                          className="att-pizza-photo"
                        />
                      ) : (
                        <div
                          className="att-pizza-photo-placeholder"
                          aria-hidden="true"
                        />
                      )}

                      <div className="att-pizza-card-body">
                        <h3>{pizza.name}</h3>

                        {description ? (
                          <p className="att-pizza-description">{description}</p>
                        ) : null}

                        <p className="att-pizza-allergens">
                          Allergènes : {pizza.allergens || "—"}
                        </p>

                        <div className="att-pizza-bottom-row">
                          <strong className="att-pizza-price">
                            {formatEuros(pizza.priceCents)}
                          </strong>

                          <div className="att-quantity-control">
                            <button
                              type="button"
                              onClick={() => setQuantity(pizza.id, quantity - 1)}
                              aria-label={`Retirer une ${pizza.name}`}
                            >
                              −
                            </button>

                            <span>{quantity}</span>

                            <button
                              type="button"
                              onClick={() => setQuantity(pizza.id, quantity + 1)}
                              aria-label={`Ajouter une ${pizza.name}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      <aside className="att-order-panel" aria-label="Préparer ma demande">
        <div className="att-order-panel-inner">
          <p className="att-order-intro-note">
            Vous pouvez naturellement commander vos pizzas par téléphone au{" "}
            <strong>06-79-95-89-62</strong>, mais en dehors des heures de service,
            merci de privilégier la prise de contact par le formulaire ci-dessous.
          </p>

          <h2>Préparer ma demande</h2>

          <p className="att-field-help">Le paiement s&apos;effectue sur place.</p>

          <div className="att-public-field">
            <label htmlFor="customerName">Nom ou prénom</label>
            <input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(event) => {
                setCustomerName(event.target.value);
                clearMessages();
              }}
              placeholder="Votre nom"
            />
          </div>

          <div className="att-public-field">
            <label htmlFor="customerPhone">Téléphone</label>
            <input
              id="customerPhone"
              type="tel"
              value={customerPhone}
              onChange={(event) => {
                setCustomerPhone(event.target.value);
                setPhoneFieldError("");
                clearMessages();
              }}
              placeholder="06 12 34 56 78"
              aria-invalid={phoneFieldError ? "true" : "false"}
              aria-describedby="customerPhoneHelp customerPhoneError"
            />

            <p id="customerPhoneHelp" className="att-field-help">
              Votre numéro nous sert simplement à vous confirmer par SMS le créneau
              retenu, et valider la commande.
            </p>

            {phoneFieldError ? (
              <p id="customerPhoneError" className="att-field-error">
                {phoneFieldError}
              </p>
            ) : null}
          </div>

          <div className="att-public-field">
            <label htmlFor="notes">Commentaires</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                clearMessages();
              }}
              placeholder="Précisions, demandes spéciales..."
            />
          </div>

          {errorMessage ? (
            <div className="message error att-inline-error">{errorMessage}</div>
          ) : null}

          <div className="att-dashed-separator" />

          <section className="att-order-subsection">
            <h3>Créneaux disponibles</h3>

            <div className="att-public-field">
              <label htmlFor="desiredTime">Heure souhaitée</label>
              <input
                id="desiredTime"
                type="time"
                value={desiredTime}
                onChange={(event) => {
                  setDesiredTime(event.target.value);
                  clearMessages();
                }}
              />

              <p className="att-field-help">
                Optionnel : si vous indiquez une heure, le créneau disponible le
                plus proche est sélectionné automatiquement.
              </p>
            </div>

            {items.length === 0 ? (
              <p className="att-empty">
                Sélectionnez au moins une pizza pour afficher les créneaux.
              </p>
            ) : isQuoting ? (
              <p className="att-empty">Mise à jour des créneaux disponibles...</p>
            ) : quote ? (
              sortedQuoteSlots.length === 0 ? (
                <p className="att-empty">
                  Aucun créneau disponible ce soir avec cette charge.
                </p>
              ) : (
                <>
                  <div className="att-slot-grid">
                    {sortedQuoteSlots.map((slot) => (
                      <label
                        key={slot}
                        className={
                          selectedSlot === slot
                            ? "att-slot-pill att-slot-pill-selected"
                            : "att-slot-pill"
                        }
                      >
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

                  <p className="att-slot-help">
                    Ces créneaux sont proposés en fonction de votre sélection.
                  </p>
                </>
              )
            ) : (
              <p className="att-empty">
                Les créneaux s’afficheront automatiquement avec votre sélection.
              </p>
            )}
          </section>

          <div className="att-dashed-separator" />

          <section className="att-order-subsection">
            <h3>Résumé de la sélection</h3>

            {selectedItems.length === 0 ? (
              <p className="att-empty">Aucune pizza sélectionnée.</p>
            ) : (
              <div className="att-summary-list">
                {selectedItems.map((item) => (
                  <div key={item.pizza.id} className="att-summary-row">
                    <div>
                      <strong>{item.pizza.name}</strong>
                      <span>{formatEuros(item.pizza.priceCents)}</span>
                    </div>

                    <div className="att-quantity-control att-small-quantity-control">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(item.pizza.id, item.quantity - 1)
                        }
                        aria-label={`Retirer une ${item.pizza.name}`}
                      >
                        −
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(item.pizza.id, item.quantity + 1)
                        }
                        aria-label={`Ajouter une ${item.pizza.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="att-total-row">
              <span>Total</span>
              <strong>{formatEuros(totalPriceCents)}</strong>
            </div>

            <p className="att-price-note">
              Prix à titre indicatif. Toute modification des recettes peut
              entraîner une variation du prix.
            </p>
          </section>

          <div className="att-send-area">
            {deviceMode === "mobile" ? (
              <button
                type="button"
                className="att-image-button"
                onClick={handleOpenSms}
                aria-label="Envoyer un SMS"
              >
                <img
                  src="/assets/button-sms-rabbit.svg"
                  alt=""
                  aria-hidden="true"
                />
              </button>
            ) : deviceMode === "desktop" ? (
              <button
                type="button"
                className="att-image-button"
                onClick={handleSendDesktopRequest}
                disabled={isSendingDesktopRequest}
                aria-label="Envoyer ma demande"
              >
                <img
                  src="/assets/button-send-rabbit.svg"
                  alt=""
                  aria-hidden="true"
                />
              </button>
            ) : (
              <p className="att-empty">Détection du type d’appareil en cours...</p>
            )}
          </div>

          {deviceMode === "desktop" ? (
            <p className="att-desktop-note">
              Une fois votre commande envoyée, elle sera contrôlée manuellement et
              nous vous confirmerons par SMS l&apos;heure !
            </p>
          ) : null}

          {successMessage ? (
            <div className="message success">{successMessage}</div>
          ) : null}

          {copyMessage ? <div className="message success">{copyMessage}</div> : null}

          {deviceMode === "mobile" ? (
            <details className="att-sms-preview">
              <summary>Voir le message généré</summary>

              <textarea id="smsPreview" value={smsBody} readOnly />

              <button
                type="button"
                className="att-secondary-outline-button att-full-width"
                onClick={handleCopyMessage}
              >
                Copier le message (iOS)
              </button>
            </details>
          ) : null}
        </div>
      </aside>

      {deviceMode === "desktop" ? (
        <section className="att-mobile-explanation-card">
          <div className="att-phone-sketch" aria-hidden="true" />

          <div>
            <h2>Sur mobile, encore plus simple !</h2>

            <p>
              Votre demande est envoyée par SMS et un échange rapide permet de
              confirmer le créneau.
            </p>
          </div>
        </section>
      ) : null}
    </section>
  );
}