"use client";

import { useMemo, useRef, useState } from "react";

import type { Partner, PartnerCategory } from "@/lib/partner-types";

type AdminPartnerFormProps = {
  initialPartners: Partner[];
};

type SavePartnerResponse = {
  ok?: boolean;
  partner?: Partner;
  error?: string;
};

const CATEGORY_LABELS: Record<PartnerCategory, string> = {
  producteur: "Producteur",
  distributeur: "Distributeur",
  partenaire: "Partenaire",
};

function sortPartners(partners: Partner[]): Partner[] {
  return [...partners].sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }

    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }

    return a.name.localeCompare(b.name, "fr");
  });
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error(`Réponse vide du serveur. Statut HTTP : ${response.status}.`);
  }

  return JSON.parse(raw) as T;
}

export default function AdminPartnerForm({
  initialPartners,
}: AdminPartnerFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [partners, setPartners] = useState(sortPartners(initialPartners));
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<PartnerCategory>("partenaire");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null);

  const [contactEnabled, setContactEnabled] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactAddress, setContactAddress] = useState("");

  const [isActive, setIsActive] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedPartner = useMemo(
    () => partners.find((partner) => partner.id === editingId) ?? null,
    [editingId, partners],
  );

  function resetForm() {
    setEditingId(null);
    setName("");
    setCategory("partenaire");
    setDescription("");
    setPhoto(null);
    setExistingPhotoPath(null);
    setContactEnabled(false);
    setContactEmail("");
    setContactPhone("");
    setContactAddress("");
    setIsActive(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function loadPartnerIntoForm(partner: Partner) {
    setEditingId(partner.id);
    setName(partner.name);
    setCategory(partner.category);
    setDescription(partner.description);
    setPhoto(null);
    setExistingPhotoPath(partner.photoPath);
    setContactEnabled(partner.contactEnabled);
    setContactEmail(partner.contactEmail);
    setContactPhone(partner.contactPhone);
    setContactAddress(partner.contactAddress);
    setIsActive(partner.isActive);
    setErrorMessage("");
    setSuccessMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function upsertPartner(updatedPartner: Partner) {
    setPartners((previous) => {
      const exists = previous.some((partner) => partner.id === updatedPartner.id);

      if (exists) {
        return sortPartners(
          previous.map((partner) =>
            partner.id === updatedPartner.id ? updatedPartner : partner,
          ),
        );
      }

      return sortPartners([...previous, updatedPartner]);
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!name.trim()) {
      setErrorMessage("Le nom du partenaire est obligatoire.");
      return;
    }

    if (!description.trim()) {
      setErrorMessage("Le texte descriptif est obligatoire.");
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();

      formData.set("name", name.trim());
      formData.set("category", category);
      formData.set("description", description.trim());
      formData.set("contactEnabled", String(contactEnabled));
      formData.set("contactEmail", contactEmail.trim());
      formData.set("contactPhone", contactPhone.trim());
      formData.set("contactAddress", contactAddress.trim());
      formData.set("isActive", String(isActive));
      formData.set("existingPhotoPath", existingPhotoPath ?? "");

      if (editingId !== null) {
        formData.set("partnerId", String(editingId));
      }

      if (photo) {
        formData.set("photo", photo);
      }

      const response = await fetch("/api/admin/partners", {
        method: editingId === null ? "POST" : "PUT",
        body: formData,
      });

      const data = await readJsonResponse<SavePartnerResponse>(response);

      if (!response.ok || !data.partner) {
        throw new Error(data.error || "Erreur lors de l'enregistrement.");
      }

      upsertPartner(data.partner);

      if (editingId === null) {
        setSuccessMessage(`Partenaire "${data.partner.name}" créé.`);
        resetForm();
      } else {
        loadPartnerIntoForm(data.partner);
        setSuccessMessage(`Partenaire "${data.partner.name}" mis à jour.`);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur lors de l'enregistrement.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="admin-grid">
      <section className="card">
        <h2>{editingId === null ? "Nouveau partenaire" : "Modifier le partenaire"}</h2>

        <p className="small">
          {editingId === null
            ? "Crée une fiche partenaire."
            : `Édition en cours : ${selectedPartner?.name ?? ""}`}
        </p>

        <div className="page-actions" style={{ marginTop: 12 }}>
          <button type="button" className="secondary" onClick={resetForm}>
            Nouvelle fiche
          </button>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="partner-name">Nom du partenaire</label>
            <input
              id="partner-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Moulin, ferme, distributeur..."
            />
          </div>

          <div className="field">
            <label htmlFor="partner-category">Catégorie</label>
            <select
              id="partner-category"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as PartnerCategory)
              }
            >
              <option value="producteur">Producteur</option>
              <option value="distributeur">Distributeur</option>
              <option value="partenaire">Partenaire</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="partner-description">Texte descriptif</label>
            <textarea
              id="partner-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Présente le partenaire, ce qu’il apporte, pourquoi tu travailles avec lui..."
              rows={10}
            />
          </div>

          <div className="field">
            <label htmlFor="partner-photo">Photo d’illustration</label>
            <input
              id="partner-photo"
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            />
            <div className="small">JPEG, PNG, WebP ou GIF, 5 Mo max.</div>
          </div>

          {existingPhotoPath ? (
            <div className="field">
              <label>Photo actuelle</label>
              <img
                src={existingPhotoPath}
                alt={name || "Partenaire"}
                className="catalog-photo"
              />
            </div>
          ) : null}

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span>Fiche visible sur la page publique</span>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={contactEnabled}
              onChange={(event) => setContactEnabled(event.target.checked)}
            />
            <span>Afficher l’encart de contact sur la fiche publique</span>
          </label>

          <div className="field">
            <label htmlFor="partner-email">Email</label>
            <input
              id="partner-email"
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="contact@example.fr"
            />
          </div>

          <div className="field">
            <label htmlFor="partner-phone">Téléphone</label>
            <input
              id="partner-phone"
              type="tel"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              placeholder="06 12 34 56 78"
            />
          </div>

          <div className="field">
            <label htmlFor="partner-address">Adresse</label>
            <textarea
              id="partner-address"
              value={contactAddress}
              onChange={(event) => setContactAddress(event.target.value)}
              placeholder="Adresse, commune, informations pratiques..."
              rows={4}
            />
          </div>

          <div className="actions">
            <button type="submit" className="primary" disabled={isSaving}>
              {isSaving
                ? "Enregistrement..."
                : editingId === null
                  ? "Créer le partenaire"
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
        <h2>Partenaires enregistrés</h2>

        {partners.length === 0 ? (
          <p className="empty">Aucun partenaire enregistré.</p>
        ) : (
          <div className="catalog-list">
            {partners.map((partner) => (
              <article
                key={partner.id}
                className={[
                  "catalog-item",
                  partner.isActive ? "catalog-item-active" : "catalog-item-inactive",
                  editingId === partner.id ? "catalog-item-selected" : "",
                ].join(" ")}
                onClick={() => loadPartnerIntoForm(partner)}
              >
                <div className="catalog-item-header">
                  <div>
                    <h3>{partner.name}</h3>
                    <div className="small">
                      {CATEGORY_LABELS[partner.category]} ·{" "}
                      {partner.isActive ? "visible" : "masqué"}
                    </div>
                  </div>
                </div>

                {partner.photoPath ? (
                  <img
                    src={partner.photoPath}
                    alt={partner.name}
                    className="catalog-photo"
                  />
                ) : null}

                <div className="catalog-section">
                  <strong>Description</strong>
                  <div className="multiline-text">
                    {partner.description || "—"}
                  </div>
                </div>

                <div className="catalog-section">
                  <strong>Contact public</strong>
                  <div className="multiline-text">
                    {partner.contactEnabled ? (
                      <>
                        {partner.contactEmail || "Pas d’email"}
                        <br />
                        {partner.contactPhone || "Pas de téléphone"}
                        <br />
                        {partner.contactAddress || "Pas d’adresse"}
                      </>
                    ) : (
                      "Désactivé"
                    )}
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