"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BusinessLoginFormProps = {
  nextPath: string;
};

type LoginResponse = {
  ok?: boolean;
  error?: string;
  nextPath?: string;
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error(`Réponse vide du serveur. Statut HTTP : ${response.status}.`);
  }

  return JSON.parse(raw) as T;
}

export default function BusinessLoginForm({
  nextPath,
}: BusinessLoginFormProps) {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/business/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          nextPath,
        }),
      });

      const data = await readJsonResponse<LoginResponse>(response);

      if (!response.ok) {
        throw new Error(data.error || "Connexion impossible.");
      }

      router.push(data.nextPath || "/business");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Connexion impossible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="business-login-username">Identifiant</label>
        <input
          id="business-login-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Identifiant business"
        />
      </div>

      <div className="field">
        <label htmlFor="business-login-password">Mot de passe</label>
        <input
          id="business-login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mot de passe"
        />
      </div>

      <div className="actions">
        <button type="submit" className="primary" disabled={isSubmitting}>
          {isSubmitting ? "Connexion..." : "Se connecter"}
        </button>
      </div>

      {errorMessage ? <div className="message error">{errorMessage}</div> : null}
    </form>
  );
}