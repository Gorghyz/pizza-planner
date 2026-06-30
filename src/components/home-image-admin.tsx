"use client";

import { FormEvent, useRef, useState, useTransition } from "react";

import type { HomeImage } from "@/lib/home-images";

type HomeImageAdminProps = {
  initialImages: HomeImage[];
};

type ApiResponse = {
  ok?: boolean;
  images?: HomeImage[];
  error?: string;
};

export default function HomeImageAdmin({
  initialImages,
}: HomeImageAdminProps) {
  const [images, setImages] = useState<HomeImage[]>(initialImages);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement | null>(null);

  async function uploadImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/home-images", {
          method: "POST",
          body: formData,
        });

        const payload = (await response.json()) as ApiResponse;

        if (!response.ok || !payload.ok || !payload.images) {
          setError(payload.error ?? "Impossible d'envoyer l'image.");
          return;
        }

        setImages(payload.images);
        formRef.current?.reset();
        setMessage(
          "Image envoyée. Elle est conservée dans la liste, mais elle n'est pas activée automatiquement.",
        );
      } catch {
        setError("Impossible d'envoyer l'image.");
      }
    });
  }

  async function activateImage(imageId: number) {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/home-images", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageId }),
        });

        const payload = (await response.json()) as ApiResponse;

        if (!response.ok || !payload.ok || !payload.images) {
          setError(payload.error ?? "Impossible d'activer l'image.");
          return;
        }

        setImages(payload.images);
        setMessage("Image d'accueil activée.");
      } catch {
        setError("Impossible d'activer l'image.");
      }
    });
  }

  return (
    <div className="admin-manager-grid">
      <section className="card">
        <h2>Ajouter une image</h2>
        <p className="small">
          Utilise une image large, idéalement autour de 3:1, par exemple 2048 ×
          682 px. Formats acceptés : PNG, JPG ou WebP, jusqu'à 8 Mo.
        </p>

        <form ref={formRef} className="form-stack" onSubmit={uploadImage}>
          <div className="field">
            <label htmlFor="home-image-file">Image</label>
            <input
              id="home-image-file"
              name="image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="home-image-title">Titre interne</label>
            <input
              id="home-image-title"
              name="title"
              type="text"
              placeholder="Ex. Carte été 2026"
            />
          </div>

          <div className="field">
            <label htmlFor="home-image-alt">Texte alternatif</label>
            <input
              id="home-image-alt"
              name="altText"
              type="text"
              placeholder="Ex. Pizzas du mois À table tonton !"
            />
          </div>

          <div className="actions">
            <button className="primary" type="submit" disabled={isPending}>
              {isPending ? "Envoi en cours..." : "Ajouter l'image"}
            </button>
          </div>
        </form>

        {message ? <p className="message success">{message}</p> : null}
        {error ? <p className="message error">{error}</p> : null}
      </section>

      <section className="card">
        <h2>Images disponibles</h2>
        <p className="small">
          Clique sur une image pour l'activer sur la page d'accueil. Les anciennes
          images restent disponibles pour pouvoir revenir en arrière.
        </p>

        {images.length === 0 ? (
          <p className="empty">Aucune image d'accueil n'a encore été envoyée.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {images.map((image) => (
              <article
                key={image.id}
                className="catalog-item"
                style={{
                  cursor: "default",
                  background: image.isActive ? "#eef8ef" : undefined,
                  borderColor: image.isActive ? "#9fd0a8" : undefined,
                }}
              >
                <img
                  src={image.imagePath}
                  alt={image.altText || image.title}
                  style={{
                    width: "100%",
                    aspectRatio: "3 / 1",
                    objectFit: "cover",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    marginBottom: 12,
                  }}
                />

                <div className="catalog-item-header">
                  <div>
                    <h3>{image.title || "Image d'accueil"}</h3>
                    <p className="small">
                      Ajoutée le {image.createdAt}
                      {image.activatedAt ? (
                        <>
                          <br />
                          Activée le {image.activatedAt}
                        </>
                      ) : null}
                    </p>
                  </div>

                  {image.isActive ? (
                    <span className="status-pill status-completed">Active</span>
                  ) : (
                    <button
                      className="small-pill-button small-pill-active"
                      type="button"
                      onClick={() => activateImage(image.id)}
                      disabled={isPending}
                    >
                      Activer
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}