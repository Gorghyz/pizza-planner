"use client";

import { useMemo, useRef, useState } from "react";
import { parseGpsCoordinates } from "@/lib/gps";
import type {
  BusinessEvent,
  BusinessEventImage,
  BusinessEventStatus,
  BusinessLocation,
  Pizza,
} from "@/lib/types";

type BusinessEventAdminProps = {
  initialEvents: BusinessEvent[];
  pizzas: Pizza[];
  locations: BusinessLocation[];
  initialDate?: string;
};

type EventFormState = {
  title: string;
  slug: string;
  status: BusinessEventStatus;
  serviceDate: string;
  opensAt: string;
  closesAt: string;
  visibleFrom: string;
  orderOpensAt: string;
  orderClosesAt: string;
  locationId: string;
  locationName: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  description: string;
  publicNote: string;
  capacityPizzas: string;
  slotCapacityPizzas: string;
  pizzaIds: number[];
  existingImages: BusinessEventImage[];
};

type NewImagePreview = {
  file: File;
  previewUrl: string;
};

type SaveEventResponse = {
  ok?: boolean;
  event?: BusinessEvent;
  error?: string;
};

const emptyForm: EventFormState = {
  title: "",
  slug: "",
  status: "draft",
  serviceDate: "",
  opensAt: "18:30",
  closesAt: "21:30",
  visibleFrom: "",
  orderOpensAt: "",
  orderClosesAt: "",
  locationId: "",
  locationName: "",
  address: "",
  city: "",
  latitude: "",
  longitude: "",
  description: "",
  publicNote: "",
  capacityPizzas: "",
  slotCapacityPizzas: "",
  pizzaIds: [],
  existingImages: [],
};

const statusLabels: Record<BusinessEventStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

function formatEuros(priceCents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(priceCents / 100);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function buildDuplicateTitle(title: string): string {
  return title.includes("copie") ? title : `${title} — copie`;
}

function sortEvents(events: BusinessEvent[]): BusinessEvent[] {
  return [...events].sort((a, b) => {
    if (a.serviceDate !== b.serviceDate) {
      return b.serviceDate.localeCompare(a.serviceDate);
    }

    if (a.opensAt !== b.opensAt) {
      return b.opensAt.localeCompare(a.opensAt);
    }

    return b.id - a.id;
  });
}

function eventToForm(event: BusinessEvent): EventFormState {
  return {
    title: event.title,
    slug: event.slug,
    status: event.status,
    serviceDate: event.serviceDate,
    opensAt: event.opensAt,
    closesAt: event.closesAt,
    visibleFrom: event.visibleFrom ?? "",
    orderOpensAt: event.orderOpensAt ?? "",
    orderClosesAt: event.orderClosesAt ?? "",
    locationId: event.locationId ? String(event.locationId) : "",
    locationName: event.locationName,
    address: event.address,
    city: event.city,
    latitude: event.latitude === null ? "" : String(event.latitude),
    longitude: event.longitude === null ? "" : String(event.longitude),
    description: event.description,
    publicNote: event.publicNote,
    capacityPizzas: event.capacityPizzas ? String(event.capacityPizzas) : "",
    slotCapacityPizzas: event.slotCapacityPizzas ? String(event.slotCapacityPizzas) : "",
    pizzaIds: event.pizzas.map((pizza) => pizza.id),
    existingImages: event.images,
  };
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error(`Réponse vide du serveur. Statut HTTP : ${response.status}.`);
  }

  return JSON.parse(raw) as T;
}

export default function BusinessEventAdmin({
  initialEvents,
  pizzas,
  locations,
  initialDate = "",
}: BusinessEventAdminProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [events, setEvents] = useState<BusinessEvent[]>(sortEvents(initialEvents));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EventFormState>(() => ({
    ...emptyForm,
    serviceDate: initialDate,
  }));
  const [newImagePreviews, setNewImagePreviews] = useState<NewImagePreview[]>([]);
  const [coordinateInput, setCoordinateInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === editingId) ?? null,
    [editingId, events],
  );

  const selectedPizzaIds = useMemo(() => new Set(form.pizzaIds), [form.pizzaIds]);

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function resetForm() {
    for (const preview of newImagePreviews) {
      URL.revokeObjectURL(preview.previewUrl);
    }

    setEditingId(null);
    setForm({
      ...emptyForm,
      serviceDate: initialDate,
    });
    setNewImagePreviews([]);
    setCoordinateInput("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    clearMessages();
  }

  function loadEvent(event: BusinessEvent) {
    for (const preview of newImagePreviews) {
      URL.revokeObjectURL(preview.previewUrl);
    }

    setEditingId(event.id);
    setForm(eventToForm(event));
    setNewImagePreviews([]);
    setCoordinateInput("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    clearMessages();
  }

  function duplicateEvent(event: BusinessEvent) {
    for (const preview of newImagePreviews) {
      URL.revokeObjectURL(preview.previewUrl);
    }

    const title = buildDuplicateTitle(event.title);
    const formCopy = eventToForm(event);

    setEditingId(null);
    setForm({
      ...formCopy,
      title,
      slug: `${slugify(title)}-${Date.now().toString().slice(-4)}`,
      status: "draft",
    });
    setNewImagePreviews([]);
    setCoordinateInput("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setErrorMessage("");
    setSuccessMessage("Copie chargée dans le formulaire. Vérifie la date, puis enregistre pour créer le nouvel événement.");
  }

  function updateField<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
    clearMessages();
  }

  function handleTitleChange(value: string) {
    setForm((previous) => ({
      ...previous,
      title: value,
      slug: previous.slug ? previous.slug : slugify(value),
    }));
    clearMessages();
  }

  function selectLocation(locationId: string) {
    const location = locations.find((entry) => String(entry.id) === locationId);

    setForm((previous) => ({
      ...previous,
      locationId,
      locationName: location?.name ?? previous.locationName,
      address: location?.address ?? previous.address,
      city: location?.city ?? previous.city,
      latitude: location?.latitude === null || location?.latitude === undefined ? previous.latitude : String(location.latitude),
      longitude: location?.longitude === null || location?.longitude === undefined ? previous.longitude : String(location.longitude),
    }));
    clearMessages();
  }

  function convertCoordinates() {
    const parsed = parseGpsCoordinates(coordinateInput);

    if (!parsed) {
      setErrorMessage(`Impossible de lire ces coordonnées. Exemple attendu : 45°38'52.8"N 0°47'53.9"E.`);
      setSuccessMessage("");
      return;
    }

    setForm((previous) => ({
      ...previous,
      latitude: parsed.latitudeText,
      longitude: parsed.longitudeText,
    }));
    setErrorMessage("");
    setSuccessMessage("Coordonnées converties dans les champs latitude et longitude.");
  }

  function togglePizza(pizzaId: number) {
    setForm((previous) => {
      const hasPizza = previous.pizzaIds.includes(pizzaId);

      return {
        ...previous,
        pizzaIds: hasPizza
          ? previous.pizzaIds.filter((id) => id !== pizzaId)
          : [...previous.pizzaIds, pizzaId],
      };
    });
    clearMessages();
  }

  function movePizza(pizzaId: number, direction: -1 | 1) {
    setForm((previous) => {
      const index = previous.pizzaIds.indexOf(pizzaId);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= previous.pizzaIds.length) {
        return previous;
      }

      const pizzaIds = [...previous.pizzaIds];
      const [pizza] = pizzaIds.splice(index, 1);
      pizzaIds.splice(nextIndex, 0, pizza);

      return {
        ...previous,
        pizzaIds,
      };
    });
    clearMessages();
  }

  function handleNewImagesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    setNewImagePreviews((previous) => [
      ...previous,
      ...files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    clearMessages();
  }

  function moveExistingImage(index: number, direction: -1 | 1) {
    setForm((previous) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= previous.existingImages.length) {
        return previous;
      }

      const existingImages = [...previous.existingImages];
      const [image] = existingImages.splice(index, 1);
      existingImages.splice(nextIndex, 0, image);

      return {
        ...previous,
        existingImages,
      };
    });
    clearMessages();
  }

  function removeExistingImage(index: number) {
    setForm((previous) => ({
      ...previous,
      existingImages: previous.existingImages.filter((_, currentIndex) => currentIndex !== index),
    }));
    clearMessages();
  }

  function removeNewImage(index: number) {
    setNewImagePreviews((previous) => {
      const preview = previous[index];

      if (preview) {
        URL.revokeObjectURL(preview.previewUrl);
      }

      return previous.filter((_, currentIndex) => currentIndex !== index);
    });
    clearMessages();
  }

  function upsertEvent(event: BusinessEvent) {
    setEvents((previous) =>
      sortEvents(
        previous.some((entry) => entry.id === event.id)
          ? previous.map((entry) => (entry.id === event.id ? event : entry))
          : [event, ...previous],
      ),
    );
  }


  async function changeEventStatus(event: BusinessEvent, nextStatus: BusinessEventStatus) {
    clearMessages();
    setIsSaving(true);

    try {
      const eventForm = eventToForm(event);
      const formData = new FormData();

      formData.set("eventId", String(event.id));
      formData.set("title", eventForm.title);
      formData.set("slug", eventForm.slug);
      formData.set("status", nextStatus);
      formData.set("serviceDate", eventForm.serviceDate);
      formData.set("opensAt", eventForm.opensAt);
      formData.set("closesAt", eventForm.closesAt);
      formData.set("visibleFrom", eventForm.visibleFrom);
      formData.set("orderOpensAt", eventForm.orderOpensAt);
      formData.set("orderClosesAt", eventForm.orderClosesAt);
      formData.set("locationId", eventForm.locationId);
      formData.set("locationName", eventForm.locationName);
      formData.set("address", eventForm.address);
      formData.set("city", eventForm.city);
      formData.set("latitude", eventForm.latitude);
      formData.set("longitude", eventForm.longitude);
      formData.set("description", eventForm.description);
      formData.set("publicNote", eventForm.publicNote);
      formData.set("capacityPizzas", eventForm.capacityPizzas);
      formData.set("slotCapacityPizzas", eventForm.slotCapacityPizzas);
      formData.set("pizzaIdsJson", JSON.stringify(eventForm.pizzaIds));
      formData.set("existingImagesJson", JSON.stringify(eventForm.existingImages));

      const response = await fetch("/api/admin/events", {
        method: "PUT",
        body: formData,
      });
      const data = await readJsonResponse<SaveEventResponse>(response);

      if (!response.ok || !data.event) {
        throw new Error(data.error || "Impossible de changer le statut de l'événement.");
      }

      upsertEvent(data.event);
      if (editingId === data.event.id) {
        setForm(eventToForm(data.event));
      }
      setSuccessMessage(`Événement "${data.event.title}" passé en ${statusLabels[data.event.status].toLowerCase()}.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de changer le statut de l'événement.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    if (!form.title.trim()) {
      setErrorMessage("Le nom de l'événement est obligatoire.");
      return;
    }

    if (!form.serviceDate) {
      setErrorMessage("La date de l'événement est obligatoire.");
      return;
    }

    if (form.pizzaIds.length === 0) {
      setErrorMessage("Choisis au moins une pizza pour l'événement.");
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();

      if (editingId) {
        formData.set("eventId", String(editingId));
      }

      formData.set("title", form.title);
      formData.set("slug", form.slug || slugify(form.title));
      formData.set("status", form.status);
      formData.set("serviceDate", form.serviceDate);
      formData.set("opensAt", form.opensAt);
      formData.set("closesAt", form.closesAt);
      formData.set("visibleFrom", form.visibleFrom);
      formData.set("orderOpensAt", form.orderOpensAt);
      formData.set("orderClosesAt", form.orderClosesAt);
      formData.set("locationId", form.locationId);
      formData.set("locationName", form.locationName);
      formData.set("address", form.address);
      formData.set("city", form.city);
      formData.set("latitude", form.latitude);
      formData.set("longitude", form.longitude);
      formData.set("description", form.description);
      formData.set("publicNote", form.publicNote);
      formData.set("capacityPizzas", form.capacityPizzas);
      formData.set("slotCapacityPizzas", form.slotCapacityPizzas);
      formData.set("pizzaIdsJson", JSON.stringify(form.pizzaIds));
      formData.set(
        "existingImagesJson",
        JSON.stringify(
          form.existingImages.map((image, index) => ({
            ...image,
            displayOrder: index * 10,
          })),
        ),
      );

      for (const preview of newImagePreviews) {
        formData.append("images", preview.file);
      }

      const response = await fetch("/api/admin/events", {
        method: editingId ? "PUT" : "POST",
        body: formData,
      });

      const data = await readJsonResponse<SaveEventResponse>(response);

      if (!response.ok || !data.event) {
        throw new Error(data.error || "Impossible d'enregistrer l'événement.");
      }

      upsertEvent(data.event);
      setEditingId(data.event.id);
      setForm(eventToForm(data.event));

      for (const preview of newImagePreviews) {
        URL.revokeObjectURL(preview.previewUrl);
      }

      setNewImagePreviews([]);
      if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
      setSuccessMessage(`Événement "${data.event.title}" enregistré.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer l'événement.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="admin-manager-grid">
      <section className="card">
        <div className="form-header">
          <div>
            <h2>{selectedEvent ? "Modifier l'événement" : "Nouvel événement"}</h2>
            <p className="small">
              Crée une ouverture spéciale avec sa date, sa carte, ses images et ses précommandes.
            </p>
          </div>

          <button type="button" className="secondary" onClick={resetForm}>
            Nouvelle fiche
          </button>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="event-title">Nom de l'événement</label>
            <input
              id="event-title"
              type="text"
              value={form.title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="Ex. Soirée pizzas à Marval"
            />
          </div>

          <div className="field-grid field-grid-2">
            <div className="field">
              <label htmlFor="event-slug">Adresse de la page</label>
              <input
                id="event-slug"
                type="text"
                value={form.slug}
                onChange={(event) => updateField("slug", slugify(event.target.value))}
                placeholder="soiree-pizzas-marval"
              />
            </div>

            <div className="field">
              <label htmlFor="event-status">Statut</label>
              <select
                id="event-status"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as BusinessEventStatus)}
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </div>
          </div>

          <div className="field-grid field-grid-2">
            <div className="field">
              <label htmlFor="event-date">Date de service</label>
              <input
                id="event-date"
                type="date"
                value={form.serviceDate}
                onChange={(event) => updateField("serviceDate", event.target.value)}
              />
            </div>

            <div className="field-grid field-grid-2">
              <div className="field">
                <label htmlFor="event-opens">Début</label>
                <input
                  id="event-opens"
                  type="time"
                  value={form.opensAt}
                  onChange={(event) => updateField("opensAt", event.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="event-closes">Fin</label>
                <input
                  id="event-closes"
                  type="time"
                  value={form.closesAt}
                  onChange={(event) => updateField("closesAt", event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="field-grid field-grid-2">
            <div className="field">
              <label htmlFor="event-visible-from">Visible sur /carte à partir de</label>
              <input
                id="event-visible-from"
                type="datetime-local"
                value={form.visibleFrom}
                onChange={(event) => updateField("visibleFrom", event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="event-order-opens">Précommandes ouvertes à partir de</label>
              <input
                id="event-order-opens"
                type="datetime-local"
                value={form.orderOpensAt}
                onChange={(event) => updateField("orderOpensAt", event.target.value)}
              />
            </div>
          </div>

          <div className="field-grid field-grid-2">
            <div className="field">
              <label htmlFor="event-order-closes">Précommandes fermées à partir de</label>
              <input
                id="event-order-closes"
                type="datetime-local"
                value={form.orderClosesAt}
                onChange={(event) => updateField("orderClosesAt", event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="event-location-select">Lieu enregistré</label>
              <select
                id="event-location-select"
                value={form.locationId}
                onChange={(event) => selectLocation(event.target.value)}
              >
                <option value="">Lieu personnalisé / non lié</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-grid field-grid-2">
            <div className="field">
              <label htmlFor="event-location-name">Nom du lieu</label>
              <input
                id="event-location-name"
                type="text"
                value={form.locationName}
                onChange={(event) => updateField("locationName", event.target.value)}
                placeholder="Ex. Place de Marval"
              />
            </div>

            <div className="field">
              <label htmlFor="event-city">Ville / secteur</label>
              <input
                id="event-city"
                type="text"
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                placeholder="Ex. Marval"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="event-address">Adresse / emplacement</label>
            <input
              id="event-address"
              type="text"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              placeholder="Ex. Devant la salle des fêtes"
            />
          </div>

          <div className="field coordinate-converter-field">
            <label htmlFor="event-coordinates-input">Coordonnées Google à convertir</label>
            <div className="coordinate-converter-row">
              <input
                id="event-coordinates-input"
                type="text"
                value={coordinateInput}
                onChange={(event) => setCoordinateInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    convertCoordinates();
                  }
                }}
                placeholder={`Ex. 45°38'52.8"N 0°47'53.9"E`}
              />
              <button type="button" className="secondary" onClick={convertCoordinates}>
                Convertir
              </button>
            </div>
            <div className="small">
              Copie les coordonnées Google en degrés/minutes/secondes : le bouton remplit les champs Latitude et Longitude ci-dessous.
            </div>
          </div>

          <div className="field-grid field-grid-2">
            <div className="field">
              <label htmlFor="event-latitude">Latitude OpenStreetMap</label>
              <input
                id="event-latitude"
                type="text"
                inputMode="decimal"
                value={form.latitude}
                onChange={(event) => updateField("latitude", event.target.value)}
                placeholder="Ex. 45.6275"
              />
            </div>

            <div className="field">
              <label htmlFor="event-longitude">Longitude OpenStreetMap</label>
              <input
                id="event-longitude"
                type="text"
                inputMode="decimal"
                value={form.longitude}
                onChange={(event) => updateField("longitude", event.target.value)}
                placeholder="Ex. 0.7996"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="event-description">Description publique</label>
            <textarea
              id="event-description"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Quelques mots simples pour expliquer la soirée."
            />
          </div>

          <div className="field">
            <label htmlFor="event-note">Note publique</label>
            <textarea
              id="event-note"
              value={form.publicNote}
              onChange={(event) => updateField("publicNote", event.target.value)}
              placeholder="Ex. Précommande conseillée, quantité limitée, paiement sur place..."
            />
          </div>

          <div className="field-grid field-grid-2">
            <div className="field">
              <label htmlFor="event-capacity">Limite totale de pizzas</label>
              <input
                id="event-capacity"
                type="number"
                min="1"
                step="1"
                value={form.capacityPizzas}
                onChange={(event) => updateField("capacityPizzas", event.target.value)}
                placeholder="Optionnel"
              />
            </div>

            <div className="field">
              <label htmlFor="event-slot-capacity">Limite par créneau</label>
              <input
                id="event-slot-capacity"
                type="number"
                min="1"
                step="1"
                value={form.slotCapacityPizzas}
                onChange={(event) => updateField("slotCapacityPizzas", event.target.value)}
                placeholder="Optionnel"
              />
            </div>
          </div>

          <div className="field">
            <label>Carte de l'événement</label>
            <p className="small" style={{ marginTop: 0 }}>
              Tu peux sélectionner une pizza désactivée : elle restera absente de la carte normale, mais pourra servir pour un événement seulement.
            </p>
            <div className="event-pizza-picker">
              {pizzas.map((pizza) => {
                const checked = selectedPizzaIds.has(pizza.id);
                const orderIndex = form.pizzaIds.indexOf(pizza.id);

                return (
                  <div key={pizza.id} className={checked ? "event-pizza-row event-pizza-row-selected" : "event-pizza-row"}>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePizza(pizza.id)}
                      />
                      <span>
                        {pizza.name} — {formatEuros(pizza.priceCents)}
                        {!pizza.active ? " · événement seulement" : ""}
                      </span>
                    </label>

                    {checked ? (
                      <div className="admin-photo-button-row">
                        <button
                          type="button"
                          className="secondary"
                          disabled={orderIndex <= 0}
                          onClick={() => movePizza(pizza.id, -1)}
                        >
                          Monter
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          disabled={orderIndex < 0 || orderIndex >= form.pizzaIds.length - 1}
                          onClick={() => movePizza(pizza.id, 1)}
                        >
                          Descendre
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label htmlFor="event-images">Images de l'événement</label>
            <input
              id="event-images"
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={handleNewImagesChange}
            />
            <div className="small">JPEG, PNG, WebP ou GIF, 5 Mo max par image.</div>
          </div>

          {form.existingImages.length > 0 || newImagePreviews.length > 0 ? (
            <div className="field">
              <label>Galerie de l'événement</label>
              <div className="admin-photo-list">
                {form.existingImages.map((image, index) => (
                  <div key={`${image.id}-${image.imagePath}`} className="admin-photo-item">
                    <img src={image.imagePath} alt={image.altText || form.title || "Événement"} />
                    <div className="admin-photo-actions">
                      <span className="small">Image {index + 1}</span>
                      <div className="admin-photo-button-row">
                        <button
                          type="button"
                          className="secondary"
                          disabled={index === 0}
                          onClick={() => moveExistingImage(index, -1)}
                        >
                          Monter
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          disabled={index === form.existingImages.length - 1}
                          onClick={() => moveExistingImage(index, 1)}
                        >
                          Descendre
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => removeExistingImage(index)}
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {newImagePreviews.map((preview, index) => (
                  <div key={preview.previewUrl} className="admin-photo-item">
                    <img src={preview.previewUrl} alt={`Nouvelle image ${index + 1}`} />
                    <div className="admin-photo-actions">
                      <span className="small">
                        Nouvelle image {index + 1} — ajoutée à l’enregistrement
                      </span>
                      <div className="admin-photo-button-row">
                        <button
                          type="button"
                          className="danger"
                          onClick={() => removeNewImage(index)}
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="actions">
            <button type="submit" className="primary" disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer l'événement"}
            </button>
          </div>

          {errorMessage ? <div className="message error">{errorMessage}</div> : null}
          {successMessage ? <div className="message success">{successMessage}</div> : null}
        </form>
      </section>

      <section className="card">
        <h2>Événements enregistrés</h2>

        {events.length === 0 ? (
          <p className="empty">Aucun événement enregistré.</p>
        ) : (
          <div className="catalog-list">
            {events.map((event) => (
              <article
                key={event.id}
                className={[
                  "catalog-item",
                  event.status === "published" ? "catalog-item-active" : "catalog-item-inactive",
                  editingId === event.id ? "catalog-item-selected" : "",
                ].join(" ")}
                onClick={() => loadEvent(event)}
              >
                <div className="catalog-item-header">
                  <div>
                    <h3>{event.title}</h3>
                    <div className="small">
                      {event.serviceDateLabel} · {event.opensAt} → {event.closesAt}
                    </div>
                  </div>
                  <span className="badge">{statusLabels[event.status]}</span>
                </div>

                <div className="admin-photo-button-row" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      loadEvent(event);
                    }}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      duplicateEvent(event);
                    }}
                  >
                    Dupliquer
                  </button>
                  {event.status === "published" ? (
                    <a
                      href={`/evenements/${event.slug}`}
                      className="link-button secondary-link"
                      target="_blank"
                      rel="noreferrer"
                      onClick={(clickEvent) => clickEvent.stopPropagation()}
                    >
                      Prévisualiser
                    </a>
                  ) : null}
                  {event.status !== "archived" ? (
                    <button
                      type="button"
                      className="danger"
                      disabled={isSaving}
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        changeEventStatus(event, "archived");
                      }}
                    >
                      Archiver
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="secondary"
                      disabled={isSaving}
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        changeEventStatus(event, "draft");
                      }}
                    >
                      Remettre en brouillon
                    </button>
                  )}
                </div>

                <div className="catalog-section">
                  <strong>Page publique</strong>
                  <div className="multiline-text">/evenements/{event.slug}</div>
                </div>

                <div className="catalog-section">
                  <strong>Lieu</strong>
                  <div className="multiline-text">
                    {[event.locationName, event.address, event.city].filter(Boolean).join("\n") || "—"}
                    {event.latitude !== null && event.longitude !== null
                      ? `\nCoordonnées : ${event.latitude}, ${event.longitude}`
                      : ""}
                  </div>
                </div>

                <div className="catalog-section">
                  <strong>Carte</strong>
                  <div className="multiline-text">
                    {event.pizzas.length > 0
                      ? event.pizzas.map((pizza) => pizza.name).join("\n")
                      : "—"}
                  </div>
                </div>

                <div className="catalog-section">
                  <strong>Précommandes</strong>
                  <div className="multiline-text">
                    {event.totalRequestedPizzas ?? 0} pizza(s) déjà demandée(s)
                    {event.capacityPizzas ? ` / limite ${event.capacityPizzas}` : ""}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
