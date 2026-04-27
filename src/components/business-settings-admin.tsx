"use client";

import { useEffect, useMemo, useState } from "react";
import { WEEKDAYS, createDefaultWeekHours } from "@/lib/business-settings";
import type { LocationWithHours, OpeningHour } from "@/lib/types";

type BusinessSettingsAdminProps = {
  initialLocations: LocationWithHours[];
};

type LocationResponse = {
  ok?: boolean;
  error?: string;
  location?: {
    id: number;
    name: string;
    address: string;
    city: string;
    notes: string;
    latitude: number | null;
    longitude: number | null;
    isActive: boolean;
    isDefault: boolean;
    displayOrder: number;
  };
  hours?: OpeningHour[];
};

type HoursResponse = {
  ok?: boolean;
  error?: string;
  hours?: OpeningHour[];
};

type LocationFormState = {
  name: string;
  address: string;
  city: string;
  notes: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
  isDefault: boolean;
};

type HourFormRow = {
  isoWeekday: number;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
};

function sortLocations(locations: LocationWithHours[]): LocationWithHours[] {
  return [...locations].sort((a, b) => {
    if (a.isDefault !== b.isDefault) {
      return a.isDefault ? -1 : 1;
    }

    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }

    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }

    return a.name.localeCompare(b.name, "fr");
  });
}

function locationToForm(location: LocationWithHours | null): LocationFormState {
  return {
    name: location?.name ?? "",
    address: location?.address ?? "",
    city: location?.city ?? "",
    notes: location?.notes ?? "",
    latitude:
      typeof location?.latitude === "number" ? String(location.latitude) : "",
    longitude:
      typeof location?.longitude === "number" ? String(location.longitude) : "",
    isActive: location?.isActive ?? true,
    isDefault: location?.isDefault ?? false,
  };
}

function hoursToFormRows(location: LocationWithHours | null): HourFormRow[] {
  const source = location?.hours ?? createDefaultWeekHours(-1);

  return WEEKDAYS.map((day) => {
    const hour = source.find((entry) => entry.isoWeekday === day.value);

    return {
      isoWeekday: day.value,
      isOpen: hour?.isOpen ?? true,
      opensAt: hour?.opensAt ?? "18:30",
      closesAt: hour?.closesAt ?? "21:30",
    };
  });
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error(`Réponse vide du serveur. Statut HTTP : ${response.status}.`);
  }

  return JSON.parse(raw) as T;
}

export default function BusinessSettingsAdmin({
  initialLocations,
}: BusinessSettingsAdminProps) {
  const [locations, setLocations] = useState<LocationWithHours[]>(
    sortLocations(initialLocations),
  );
  const [selectedLocationId, setSelectedLocationId] = useState<number | "new">(
    initialLocations[0]?.id ?? "new",
  );

  const selectedLocation = useMemo(
    () =>
      selectedLocationId === "new"
        ? null
        : locations.find((location) => location.id === selectedLocationId) ?? null,
    [locations, selectedLocationId],
  );

  const [locationForm, setLocationForm] = useState<LocationFormState>(
    locationToForm(selectedLocation),
  );
  const [hourRows, setHourRows] = useState<HourFormRow[]>(
    hoursToFormRows(selectedLocation),
  );

  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setLocationForm(locationToForm(selectedLocation));
    setHourRows(hoursToFormRows(selectedLocation));
  }, [selectedLocation]);

  function upsertLocation(
    nextLocation: LocationResponse["location"],
    nextHours: OpeningHour[],
  ) {
    if (!nextLocation) {
      return;
    }

    setLocations((previous) =>
      sortLocations(
        previous.some((location) => location.id === nextLocation.id)
          ? previous.map((location) =>
              location.id === nextLocation.id
                ? { ...nextLocation, hours: nextHours }
                : {
                    ...location,
                    isDefault:
                      nextLocation.isDefault && location.id !== nextLocation.id
                        ? false
                        : location.isDefault,
                  },
            )
          : [
              ...previous.map((location) => ({
                ...location,
                isDefault:
                  nextLocation.isDefault && location.id !== nextLocation.id
                    ? false
                    : location.isDefault,
              })),
              {
                ...nextLocation,
                hours: nextHours,
              },
            ],
      ),
    );
  }

  function resetToNewLocation() {
    setSelectedLocationId("new");
    setLocationForm(locationToForm(null));
    setHourRows(hoursToFormRows(null));
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSaveLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!locationForm.name.trim()) {
      setErrorMessage("Le nom du lieu est obligatoire.");
      return;
    }

    setIsSavingLocation(true);

    try {
      const response = await fetch("/api/admin/business/locations", {
        method: selectedLocation ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationId: selectedLocation?.id,
          ...locationForm,
        }),
      });

      const data = await readJsonResponse<LocationResponse>(response);

      if (!response.ok || !data.location || !data.hours) {
        throw new Error(data.error || "Impossible d'enregistrer le lieu.");
      }

      upsertLocation(data.location, data.hours);
      setSelectedLocationId(data.location.id);
      setSuccessMessage(
        selectedLocation
          ? `Lieu "${data.location.name}" mis à jour.`
          : `Lieu "${data.location.name}" créé.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer le lieu.",
      );
    } finally {
      setIsSavingLocation(false);
    }
  }

  async function handleSaveHours() {
    if (!selectedLocation) {
      setErrorMessage("Enregistre d'abord le lieu.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    for (const row of hourRows) {
      if (row.isOpen && (!row.opensAt || !row.closesAt)) {
        setErrorMessage("Chaque jour ouvert doit avoir une heure d'ouverture et de fermeture.");
        return;
      }
    }

    setIsSavingHours(true);

    try {
      const response = await fetch("/api/admin/business/hours", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationId: selectedLocation.id,
          hours: hourRows,
        }),
      });

      const data = await readJsonResponse<HoursResponse>(response);

      if (!response.ok || !data.hours) {
        throw new Error(data.error || "Impossible d'enregistrer les horaires.");
      }

      setLocations((previous) =>
        sortLocations(
          previous.map((location) =>
            location.id === selectedLocation.id
              ? {
                  ...location,
                  hours: data.hours ?? [],
                }
              : location,
          ),
        ),
      );

      setSuccessMessage(`Horaires du lieu "${selectedLocation.name}" enregistrés.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer les horaires.",
      );
    } finally {
      setIsSavingHours(false);
    }
  }

  return (
    <div className="admin-manager-grid">
      <section className="card">
        <div className="form-header">
          <div>
            <h2>{selectedLocation ? "Modifier le lieu" : "Nouveau lieu"}</h2>
            <p className="small">
              Gère les lieux d&apos;ouverture, les coordonnées GPS et leurs horaires hebdomadaires.
            </p>
          </div>

          <button type="button" className="secondary" onClick={resetToNewLocation}>
            Nouveau lieu
          </button>
        </div>

        <form className="form-stack" onSubmit={handleSaveLocation}>
          <div className="field-grid field-grid-2">
            <div className="field">
              <label htmlFor="location-name">Nom du lieu</label>
              <input
                id="location-name"
                type="text"
                value={locationForm.name}
                onChange={(event) =>
                  setLocationForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                placeholder="Ex. Marché de Marlenheim"
              />
            </div>

            <div className="field">
              <label htmlFor="location-city">Ville / secteur</label>
              <input
                id="location-city"
                type="text"
                value={locationForm.city}
                onChange={(event) =>
                  setLocationForm((previous) => ({
                    ...previous,
                    city: event.target.value,
                  }))
                }
                placeholder="Ex. Marlenheim"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="location-address">Adresse / emplacement</label>
            <input
              id="location-address"
              type="text"
              value={locationForm.address}
              onChange={(event) =>
                setLocationForm((previous) => ({
                  ...previous,
                  address: event.target.value,
                }))
              }
              placeholder="Ex. Place de l'église"
            />
          </div>

          <div className="field-grid field-grid-2">
            <div className="field">
              <label htmlFor="location-latitude">Latitude</label>
              <input
                id="location-latitude"
                type="text"
                inputMode="decimal"
                value={locationForm.latitude}
                onChange={(event) =>
                  setLocationForm((previous) => ({
                    ...previous,
                    latitude: event.target.value,
                  }))
                }
                placeholder="Ex. 48.123456"
              />
            </div>

            <div className="field">
              <label htmlFor="location-longitude">Longitude</label>
              <input
                id="location-longitude"
                type="text"
                inputMode="decimal"
                value={locationForm.longitude}
                onChange={(event) =>
                  setLocationForm((previous) => ({
                    ...previous,
                    longitude: event.target.value,
                  }))
                }
                placeholder="Ex. 7.654321"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="location-notes">Notes publiques</label>
            <textarea
              id="location-notes"
              value={locationForm.notes}
              onChange={(event) =>
                setLocationForm((previous) => ({
                  ...previous,
                  notes: event.target.value,
                }))
              }
              placeholder="Ex. Foodtruck présent selon la météo"
            />
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={locationForm.isActive}
              onChange={(event) =>
                setLocationForm((previous) => ({
                  ...previous,
                  isActive: event.target.checked,
                }))
              }
            />
            <span>Lieu actif côté client</span>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={locationForm.isDefault}
              onChange={(event) =>
                setLocationForm((previous) => ({
                  ...previous,
                  isDefault: event.target.checked,
                }))
              }
            />
            <span>Lieu par défaut pour le service du jour</span>
          </label>

          <div className="actions">
            <button type="submit" className="primary" disabled={isSavingLocation}>
              {isSavingLocation
                ? "Enregistrement..."
                : selectedLocation
                  ? "Enregistrer le lieu"
                  : "Créer le lieu"}
            </button>
          </div>
        </form>

        <hr style={{ margin: "20px 0", borderColor: "var(--border)" }} />

        <div className="form-stack">
          <div className="form-header">
            <div>
              <h2>Horaires hebdomadaires</h2>
              <p className="small">
                {selectedLocation
                  ? `Réglage pour : ${selectedLocation.name}`
                  : "Crée ou sélectionne d'abord un lieu."}
              </p>
            </div>

            <button
              type="button"
              className="primary"
              onClick={handleSaveHours}
              disabled={!selectedLocation || isSavingHours}
            >
              {isSavingHours ? "Enregistrement..." : "Enregistrer les horaires"}
            </button>
          </div>

          <div className="hours-admin-grid">
            {hourRows.map((row) => {
              const weekdayLabel =
                WEEKDAYS.find((day) => day.value === row.isoWeekday)?.label ?? "Jour";

              return (
                <div key={row.isoWeekday} className="hour-admin-row">
                  <div className="hour-admin-title">{weekdayLabel}</div>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={row.isOpen}
                      onChange={(event) =>
                        setHourRows((previous) =>
                          previous.map((entry) =>
                            entry.isoWeekday === row.isoWeekday
                              ? {
                                  ...entry,
                                  isOpen: event.target.checked,
                                }
                              : entry,
                          ),
                        )
                      }
                    />
                    <span>Ouvert</span>
                  </label>

                  <div className="field-grid field-grid-2">
                    <div className="field">
                      <label>Ouverture</label>
                      <input
                        type="time"
                        value={row.opensAt}
                        disabled={!row.isOpen}
                        onChange={(event) =>
                          setHourRows((previous) =>
                            previous.map((entry) =>
                              entry.isoWeekday === row.isoWeekday
                                ? {
                                    ...entry,
                                    opensAt: event.target.value,
                                  }
                                : entry,
                            ),
                          )
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Fermeture</label>
                      <input
                        type="time"
                        value={row.closesAt}
                        disabled={!row.isOpen}
                        onChange={(event) =>
                          setHourRows((previous) =>
                            previous.map((entry) =>
                              entry.isoWeekday === row.isoWeekday
                                ? {
                                    ...entry,
                                    closesAt: event.target.value,
                                  }
                                : entry,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {errorMessage ? <div className="message error">{errorMessage}</div> : null}
        {successMessage ? <div className="message success">{successMessage}</div> : null}
      </section>

      <section className="card">
        <h2>Lieux enregistrés</h2>

        {locations.length === 0 ? (
          <p className="empty">Aucun lieu enregistré.</p>
        ) : (
          <div className="catalog-list">
            {locations.map((location) => (
              <article
                key={location.id}
                className={[
                  "catalog-item",
                  location.isActive ? "catalog-item-active" : "catalog-item-inactive",
                  selectedLocation?.id === location.id ? "catalog-item-selected" : "",
                ].join(" ")}
                onClick={() => setSelectedLocationId(location.id)}
              >
                <div className="catalog-item-header">
                  <div>
                    <h3>{location.name}</h3>
                    <div className="small">
                      {location.city || "Ville non renseignée"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {location.isDefault ? (
                      <span className="badge">Par défaut</span>
                    ) : null}
                    <span className="badge">
                      {location.isActive ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </div>

                <div className="catalog-section">
                  <strong>Adresse</strong>
                  <div className="multiline-text">{location.address || "—"}</div>
                </div>

                <div className="catalog-section">
                  <strong>Coordonnées GPS</strong>
                  <div className="multiline-text">
                    {location.latitude !== null && location.longitude !== null
                      ? `${location.latitude}, ${location.longitude}`
                      : "—"}
                  </div>
                </div>

                <div className="catalog-section">
                  <strong>Notes</strong>
                  <div className="multiline-text">{location.notes || "—"}</div>
                </div>

                <div className="catalog-section">
                  <strong>Horaires</strong>
                  <div className="multiline-text">
                    {location.hours
                      .map((hour) => {
                        const label =
                          WEEKDAYS.find((day) => day.value === hour.isoWeekday)?.label ??
                          "Jour";

                        if (!hour.isOpen || !hour.opensAt || !hour.closesAt) {
                          return `${label} : fermé`;
                        }

                        return `${label} : ${hour.opensAt} → ${hour.closesAt}`;
                      })
                      .join("\n")}
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