"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Pizza, PizzaPhoto } from "@/lib/types";

type AdminPizzaFormProps = {
  initialPizzas: Pizza[];
};

type SavePizzaResponse = {
  ok?: boolean;
  pizza?: Pizza;
  error?: string;
};

type NewPhotoPreview = {
  file: File;
  previewUrl: string;
};

function formatEuros(priceCents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(priceCents / 100);
}

function sortPizzas(pizzas: Pizza[]): Pizza[] {
  return [...pizzas].sort((a, b) => {
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }

    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }

    return a.name.localeCompare(b.name, "fr");
  });
}

function sortPizzaPhotos(photos: PizzaPhoto[]): PizzaPhoto[] {
  return [...photos].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }

    return a.id - b.id;
  });
}

function getPizzaPhotos(pizza: Pizza): PizzaPhoto[] {
  if (pizza.photos.length > 0) {
    return sortPizzaPhotos(pizza.photos);
  }

  if (!pizza.photoPath) {
    return [];
  }

  return [
    {
      id: 0,
      pizzaId: pizza.id,
      imagePath: pizza.photoPath,
      altText: pizza.name,
      displayOrder: 0,
    },
  ];
}

function getPrimaryPhotoPath(pizza: Pizza): string | null {
  return getPizzaPhotos(pizza)[0]?.imagePath ?? pizza.photoPath;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error(`Réponse vide du serveur. Statut HTTP : ${response.status}.`);
  }

  return JSON.parse(raw) as T;
}

export default function AdminPizzaForm({
  initialPizzas,
}: AdminPizzaFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pizzas, setPizzas] = useState<Pizza[]>(sortPizzas(initialPizzas));
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [priceEuros, setPriceEuros] = useState("0.00");
  const [seasonality, setSeasonality] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [description, setDescription] = useState("");
  const [allergens, setAllergens] = useState("");
  const [prepMinutes, setPrepMinutes] = useState("4");
  const [active, setActive] = useState(true);
  const [existingPhotos, setExistingPhotos] = useState<PizzaPhoto[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<NewPhotoPreview[]>([]);
  const newPhotoPreviewsRef = useRef<NewPhotoPreview[]>([]);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [busyPizzaId, setBusyPizzaId] = useState<number | null>(null);

  const selectedPizza = useMemo(
    () => pizzas.find((pizza) => pizza.id === editingId) ?? null,
    [editingId, pizzas],
  );

  useEffect(() => {
    newPhotoPreviewsRef.current = newPhotoPreviews;
  }, [newPhotoPreviews]);

  useEffect(() => {
    return () => {
      for (const preview of newPhotoPreviewsRef.current) {
        URL.revokeObjectURL(preview.previewUrl);
      }
    };
  }, []);

  function clearNewPhotoPreviews() {
    setNewPhotoPreviews((previous) => {
      for (const preview of previous) {
        URL.revokeObjectURL(preview.previewUrl);
      }

      return [];
    });
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setPriceEuros("0.00");
    setSeasonality("");
    setIngredients("");
    setDescription("");
    setAllergens("");
    setPrepMinutes("4");
    setActive(true);
    setExistingPhotos([]);
    clearNewPhotoPreviews();
    setErrorMessage("");
    setSuccessMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function loadPizzaIntoForm(pizza: Pizza) {
    setEditingId(pizza.id);
    setName(pizza.name);
    setPriceEuros((pizza.priceCents / 100).toFixed(2));
    setSeasonality(pizza.seasonality);
    setIngredients(pizza.ingredients);
    setDescription(pizza.description);
    setAllergens(pizza.allergens);
    setPrepMinutes(String(pizza.prepMinutes));
    setActive(pizza.active);
    setExistingPhotos(getPizzaPhotos(pizza));
    clearNewPhotoPreviews();
    setErrorMessage("");
    setSuccessMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function upsertPizza(updatedPizza: Pizza) {
    setPizzas((previous) => {
      const exists = previous.some((pizza) => pizza.id === updatedPizza.id);

      if (exists) {
        return sortPizzas(
          previous.map((pizza) =>
            pizza.id === updatedPizza.id ? updatedPizza : pizza,
          ),
        );
      }

      return sortPizzas([...previous, updatedPizza]);
    });
  }

  function moveExistingPhoto(index: number, direction: -1 | 1) {
    setExistingPhotos((previous) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= previous.length) {
        return previous;
      }

      const next = [...previous];
      const [photo] = next.splice(index, 1);
      next.splice(nextIndex, 0, photo);

      return next;
    });
  }

  function removeExistingPhoto(index: number) {
    setExistingPhotos((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  }

  function removeNewPhoto(index: number) {
    setNewPhotoPreviews((previous) => {
      const photo = previous[index];

      if (photo) {
        URL.revokeObjectURL(photo.previewUrl);
      }

      return previous.filter((_, currentIndex) => currentIndex !== index);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleNewPhotosChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    setNewPhotoPreviews((previous) => [
      ...previous,
      ...files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);

    event.target.value = "";
  }

  async function handleToggleActive(
    event: React.MouseEvent<HTMLButtonElement>,
    pizzaId: number,
  ) {
    event.stopPropagation();

    setErrorMessage("");
    setSuccessMessage("");
    setBusyPizzaId(pizzaId);

    try {
      const response = await fetch("/api/admin/pizzas/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pizzaId }),
      });

      const data = await readJsonResponse<SavePizzaResponse>(response);

      if (!response.ok || !data.pizza) {
        throw new Error(data.error || "Impossible de changer l'état.");
      }

      upsertPizza(data.pizza);

      if (editingId === data.pizza.id) {
        loadPizzaIntoForm(data.pizza);
      }

      setSuccessMessage(
        data.pizza.active
          ? `La pizza "${data.pizza.name}" est maintenant active.`
          : `La pizza "${data.pizza.name}" est maintenant inactive.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur de mise à jour.",
      );
    } finally {
      setBusyPizzaId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!name.trim()) {
      setErrorMessage("Le nom de la pizza est obligatoire.");
      return;
    }

    const numericPrep = Number(prepMinutes);

    if (!Number.isInteger(numericPrep) || numericPrep <= 0) {
      setErrorMessage("Le temps de préparation doit être un entier positif.");
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      const orderedExistingPhotos = existingPhotos.map((photo, index) => ({
        ...photo,
        altText: photo.altText || name.trim(),
        displayOrder: index * 10,
      }));

      formData.set("name", name.trim());
      formData.set("priceEuros", priceEuros.trim());
      formData.set("seasonality", seasonality.trim());
      formData.set("ingredients", ingredients.trim());
      formData.set("description", description.trim());
      formData.set("allergens", allergens.trim());
      formData.set("prepMinutes", String(numericPrep));
      formData.set("active", String(active));
      formData.set("existingPhotosJson", JSON.stringify(orderedExistingPhotos));
      formData.set("existingPhotoPath", orderedExistingPhotos[0]?.imagePath ?? "");

      if (editingId !== null) {
        formData.set("pizzaId", String(editingId));
      }

      for (const preview of newPhotoPreviews) {
        formData.append("photos", preview.file);
      }

      const response = await fetch("/api/admin/pizzas", {
        method: editingId === null ? "POST" : "PUT",
        body: formData,
      });

      const data = await readJsonResponse<SavePizzaResponse>(response);

      if (!response.ok || !data.pizza) {
        throw new Error(data.error || "Erreur lors de l'enregistrement.");
      }

      upsertPizza(data.pizza);

      if (editingId === null) {
        setSuccessMessage(`Pizza "${data.pizza.name}" créée.`);
        resetForm();
      } else {
        loadPizzaIntoForm(data.pizza);
        setSuccessMessage(`Pizza "${data.pizza.name}" mise à jour.`);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'enregistrement.",
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
            <h2>{editingId === null ? "Nouvelle pizza" : "Modifier la pizza"}</h2>
            <p className="small">
              {editingId === null
                ? "Crée une nouvelle pizza."
                : `Édition en cours : ${selectedPizza?.name ?? ""}`}
            </p>
          </div>

          <button type="button" className="secondary" onClick={resetForm}>
            Nouvelle fiche
          </button>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="pizza-name">Nom de la pizza</label>
            <input
              id="pizza-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Reine"
            />
          </div>

          <div className="field-grid field-grid-2">
            <div className="field">
              <label htmlFor="pizza-price">Prix client (€)</label>
              <input
                id="pizza-price"
                type="text"
                value={priceEuros}
                onChange={(event) => setPriceEuros(event.target.value)}
                placeholder="Ex. 12.50"
              />
            </div>

            <div className="field">
              <label htmlFor="pizza-prep">Temps standard de préparation (min)</label>
              <input
                id="pizza-prep"
                type="number"
                min="1"
                step="1"
                value={prepMinutes}
                onChange={(event) => setPrepMinutes(event.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="pizza-seasonality">Saisonnalité</label>
            <input
              id="pizza-seasonality"
              type="text"
              value={seasonality}
              onChange={(event) => setSeasonality(event.target.value)}
              placeholder="Ex. juillet à septembre"
            />
          </div>

          <div className="field">
            <label htmlFor="pizza-ingredients">Ingrédients</label>
            <textarea
              id="pizza-ingredients"
              value={ingredients}
              onChange={(event) => setIngredients(event.target.value)}
              placeholder="Ex. base tomate, mozzarella, jambon, champignons"
            />
          </div>

          <div className="field">
            <label htmlFor="pizza-description">Description</label>
            <textarea
              id="pizza-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Décris la pizza"
            />
          </div>

          <div className="field">
            <label htmlFor="pizza-allergens">Allergènes</label>
            <textarea
              id="pizza-allergens"
              value={allergens}
              onChange={(event) => setAllergens(event.target.value)}
              placeholder="Ex. gluten, lait"
            />
          </div>

          <details className="info-box">
            <summary>
              <strong>Rappel des 14 allergènes à mentionner</strong>
            </summary>
            <ul className="helper-list" style={{ marginTop: 10 }}>
              <li>Céréales contenant du gluten</li>
              <li>Crustacés</li>
              <li>Œufs</li>
              <li>Poissons</li>
              <li>Arachides</li>
              <li>Soja</li>
              <li>Lait</li>
              <li>Fruits à coque</li>
              <li>Céleri</li>
              <li>Moutarde</li>
              <li>Graines de sésame</li>
              <li>Anhydride sulfureux et sulfites</li>
              <li>Lupin</li>
              <li>Mollusques</li>
            </ul>
          </details>

          <div className="field">
            <label htmlFor="pizza-photos">Photos</label>
            <input
              id="pizza-photos"
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={handleNewPhotosChange}
            />
            <div className="small">
              JPEG, PNG, WebP ou GIF, 5 Mo max par image. La première photo est
              utilisée comme photo principale.
            </div>
          </div>

          {existingPhotos.length > 0 || newPhotoPreviews.length > 0 ? (
            <div className="field">
              <label>Galerie de la pizza</label>

              <div className="admin-photo-list">
                {existingPhotos.map((photo, index) => (
                  <div key={`${photo.id}-${photo.imagePath}`} className="admin-photo-item">
                    <img src={photo.imagePath} alt={photo.altText || name || "Pizza"} />

                    <div className="admin-photo-actions">
                      <span className="small">
                        {index === 0 ? "Photo principale" : `Photo ${index + 1}`}
                      </span>

                      <div className="admin-photo-button-row">
                        <button
                          type="button"
                          className="secondary"
                          disabled={index === 0}
                          onClick={() => moveExistingPhoto(index, -1)}
                        >
                          Monter
                        </button>

                        <button
                          type="button"
                          className="secondary"
                          disabled={index === existingPhotos.length - 1}
                          onClick={() => moveExistingPhoto(index, 1)}
                        >
                          Descendre
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() => removeExistingPhoto(index)}
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {newPhotoPreviews.map((preview, index) => (
                  <div key={preview.previewUrl} className="admin-photo-item">
                    <img src={preview.previewUrl} alt={`Nouvelle photo ${index + 1}`} />

                    <div className="admin-photo-actions">
                      <span className="small">
                        Nouvelle photo {index + 1} — ajoutée à l’enregistrement
                      </span>

                      <div className="admin-photo-button-row">
                        <button
                          type="button"
                          className="danger"
                          onClick={() => removeNewPhoto(index)}
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

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
            <span>Pizza active sur la carte actuelle</span>
          </label>

          <div className="actions">
            <button type="submit" className="primary" disabled={isSaving}>
              {isSaving
                ? "Enregistrement..."
                : editingId === null
                  ? "Créer la pizza"
                  : "Enregistrer les modifications"}
            </button>
          </div>

          {errorMessage ? (
            <div className="message error">{errorMessage}</div>
          ) : null}

          {successMessage ? (
            <div className="message success">{successMessage}</div>
          ) : null}
        </form>
      </section>

      <section className="card">
        <h2>Pizzas enregistrées</h2>

        {pizzas.length === 0 ? (
          <p className="empty">Aucune pizza enregistrée.</p>
        ) : (
          <div className="catalog-list">
            {pizzas.map((pizza) => {
              const primaryPhotoPath = getPrimaryPhotoPath(pizza);
              const photoCount = getPizzaPhotos(pizza).length;

              return (
                <article
                  key={pizza.id}
                  className={[
                    "catalog-item",
                    pizza.active ? "catalog-item-active" : "catalog-item-inactive",
                    editingId === pizza.id ? "catalog-item-selected" : "",
                  ].join(" ")}
                  onClick={() => loadPizzaIntoForm(pizza)}
                >
                  <div className="catalog-item-header">
                    <div>
                      <h3>{pizza.name}</h3>
                      <div className="small">
                        {formatEuros(pizza.priceCents)} · {pizza.prepMinutes} min · {photoCount} photo{photoCount > 1 ? "s" : ""}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={[
                        "small-pill-button",
                        pizza.active ? "small-pill-active" : "small-pill-inactive",
                      ].join(" ")}
                      disabled={busyPizzaId === pizza.id}
                      onClick={(event) => handleToggleActive(event, pizza.id)}
                    >
                      {busyPizzaId === pizza.id
                        ? "..."
                        : pizza.active
                          ? "Active"
                          : "Inactive"}
                    </button>
                  </div>

                  {primaryPhotoPath ? (
                    <img
                      src={primaryPhotoPath}
                      alt={pizza.name}
                      className="catalog-photo"
                    />
                  ) : null}

                  <div className="catalog-section">
                    <strong>Saisonnalité</strong>
                    <div className="multiline-text">
                      {pizza.seasonality || "—"}
                    </div>
                  </div>

                  <div className="catalog-section">
                    <strong>Ingrédients</strong>
                    <div className="multiline-text">
                      {pizza.ingredients || "—"}
                    </div>
                  </div>

                  <div className="catalog-section">
                    <strong>Description</strong>
                    <div className="multiline-text">
                      {pizza.description || "—"}
                    </div>
                  </div>

                  <div className="catalog-section">
                    <strong>Allergènes</strong>
                    <div className="multiline-text">
                      {pizza.allergens || "—"}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
